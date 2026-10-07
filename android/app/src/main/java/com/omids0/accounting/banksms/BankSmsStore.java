package com.omids0.accounting.banksms;

import android.content.Context;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import androidx.annotation.RequiresApi;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Pending bank SMS plus the ids already confirmed or dismissed, in one file that
 * is AES-GCM encrypted with an Android Keystore key and excluded from backups.
 */
final class BankSmsStore {

    /** One SMS waiting to be stored. */
    static final class Candidate {

        final String sender;
        final String body;
        final long receivedAt;
        final String source;

        Candidate(String sender, String body, long receivedAt, String source) {
            this.sender = sender == null ? "" : sender;
            this.body = body == null ? "" : body;
            this.receivedAt = receivedAt;
            this.source = source;
        }
    }

    private static final String FILE_NAME = "bank_sms_store.bin";
    private static final String KEY_ALIAS = "bank_sms_store";
    private static final String KEYSTORE = "AndroidKeyStore";
    private static final long HANDLED_TTL_MS = 120L * 24 * 60 * 60 * 1000;
    private static final int MAX_PENDING = 500;
    private static final byte FORMAT_PLAIN = 0;
    private static final byte FORMAT_AES_GCM = 1;

    private BankSmsStore() {}

    /** Bank SMS carry the balance and time, so the body alone identifies one. */
    static String idFor(String body) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(body.trim().replaceAll("\\s+", " ").getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);

            for (byte b : hash) hex.append(String.format("%02x", b));

            return hex.toString();
        } catch (Exception e) {
            return Integer.toHexString(body.hashCode());
        }
    }

    /** @return how many were new (not pending and not handled before). */
    static synchronized int addAll(Context context, List<Candidate> candidates) {
        if (candidates.isEmpty()) return 0;

        try {
            JSONObject state = load(context);
            JSONArray items = state.getJSONArray("items");
            JSONObject handled = state.getJSONObject("handled");
            Set<String> known = new HashSet<>();
            int added = 0;

            for (int i = 0; i < items.length(); i++) known.add(items.getJSONObject(i).optString("id"));

            for (Candidate candidate : candidates) {
                String id = idFor(candidate.body);

                if (known.contains(id) || handled.has(id)) continue;

                while (items.length() >= MAX_PENDING) items.remove(0);

                JSONObject item = new JSONObject();

                item.put("id", id);
                item.put("sender", candidate.sender);
                item.put("body", candidate.body);
                item.put("receivedAt", candidate.receivedAt);
                item.put("source", candidate.source);
                items.put(item);
                known.add(id);
                added++;
            }

            if (added > 0) save(context, state);

            return added;
        } catch (JSONException e) {
            return 0;
        }
    }

    static synchronized JSONArray pending(Context context) {
        try {
            return load(context).getJSONArray("items");
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    static synchronized int pendingCount(Context context) {
        return pending(context).length();
    }

    static synchronized void markHandled(Context context, List<String> ids) {
        if (ids.isEmpty()) return;

        try {
            JSONObject state = load(context);
            JSONArray items = state.getJSONArray("items");
            JSONObject handled = state.getJSONObject("handled");
            Set<String> done = new HashSet<>(ids);
            JSONArray remaining = new JSONArray();
            long now = System.currentTimeMillis();

            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);

                if (!done.contains(item.optString("id"))) remaining.put(item);
            }
            for (String id : ids) handled.put(id, now);

            pruneHandled(handled, now);
            state.put("items", remaining);
            save(context, state);
        } catch (JSONException ignored) {
            // A corrupt state is replaced on the next successful write.
        }
    }

    static synchronized void clear(Context context) {
        File file = file(context);

        if (file.exists() && !file.delete()) save(context, emptyState());
    }

    private static void pruneHandled(JSONObject handled, long now) {
        Iterator<String> keys = handled.keys();

        while (keys.hasNext()) {
            String key = keys.next();

            if (now - handled.optLong(key, 0) > HANDLED_TTL_MS) keys.remove();
        }
    }

    private static File file(Context context) {
        return new File(context.getNoBackupFilesDir(), FILE_NAME);
    }

    private static JSONObject emptyState() {
        JSONObject state = new JSONObject();

        try {
            state.put("items", new JSONArray());
            state.put("handled", new JSONObject());
        } catch (JSONException ignored) {
            // Constant keys cannot fail.
        }

        return state;
    }

    private static JSONObject load(Context context) {
        File file = file(context);

        if (!file.exists()) return emptyState();

        try {
            byte[] data = readAll(file);

            if (data.length == 0) return emptyState();

            byte[] plain;

            if (data[0] == FORMAT_AES_GCM && Build.VERSION.SDK_INT >= 23) {
                plain = decrypt(data);
            } else {
                plain = Arrays.copyOfRange(data, 1, data.length);
            }

            JSONObject state = new JSONObject(new String(plain, StandardCharsets.UTF_8));

            if (!state.has("items")) state.put("items", new JSONArray());
            if (!state.has("handled")) state.put("handled", new JSONObject());

            return state;
        } catch (Exception e) {
            // Unreadable (e.g. key lost after a restore): start over rather than crash.
            return emptyState();
        }
    }

    private static void save(Context context, JSONObject state) {
        byte[] plain = state.toString().getBytes(StandardCharsets.UTF_8);
        byte[] data;

        try {
            data = Build.VERSION.SDK_INT >= 23 ? encrypt(plain) : withFormat(FORMAT_PLAIN, plain);
        } catch (Exception e) {
            return;
        }

        try (FileOutputStream out = new FileOutputStream(file(context))) {
            out.write(data);
        } catch (IOException ignored) {
            // Nothing sensible to do; the SMS stays in the system inbox for the next scan.
        }
    }

    private static byte[] withFormat(byte format, byte[] body) {
        byte[] out = new byte[body.length + 1];

        out[0] = format;
        System.arraycopy(body, 0, out, 1, body.length);

        return out;
    }

    private static byte[] readAll(File file) throws IOException {
        try (InputStream in = new FileInputStream(file)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;

            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);

            return out.toByteArray();
        }
    }

    @RequiresApi(23)
    private static SecretKey key() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE);

        keyStore.load(null);

        if (keyStore.containsAlias(KEY_ALIAS)) {
            return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
        }

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);

        generator.init(
            new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        );

        return generator.generateKey();
    }

    /** Layout: [format][iv length][iv][ciphertext + tag]. */
    @RequiresApi(23)
    private static byte[] encrypt(byte[] plain) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");

        cipher.init(Cipher.ENCRYPT_MODE, key());

        byte[] iv = cipher.getIV();
        byte[] sealed = cipher.doFinal(plain);
        byte[] out = new byte[2 + iv.length + sealed.length];

        out[0] = FORMAT_AES_GCM;
        out[1] = (byte) iv.length;
        System.arraycopy(iv, 0, out, 2, iv.length);
        System.arraycopy(sealed, 0, out, 2 + iv.length, sealed.length);

        return out;
    }

    @RequiresApi(23)
    private static byte[] decrypt(byte[] data) throws Exception {
        int ivLength = data[1];
        byte[] iv = Arrays.copyOfRange(data, 2, 2 + ivLength);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");

        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));

        return cipher.doFinal(data, 2 + ivLength, data.length - 2 - ivLength);
    }
}
