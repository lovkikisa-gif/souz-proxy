package ru.souz.proxy.auth

import org.mindrot.jbcrypt.BCrypt
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import java.util.Base64
import java.security.SecureRandom

object PasswordHasher {
    fun hash(password: String): String {
        return BCrypt.hashpw(password, BCrypt.gensalt(12))
    }

    fun verify(password: String, hashed: String): Boolean {
        return BCrypt.checkpw(password, hashed)
    }
}

object TokenHasher {
    private fun hmacSha256(secret: String, data: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        val secretKey = SecretKeySpec(secret.toByteArray(), "HmacSHA256")
        mac.init(secretKey)
        val hash = mac.doFinal(data.toByteArray())
        return Base64.getUrlEncoder().withoutPadding().encodeToString(hash)
    }

    fun hashWelcomeKey(secret: String, rawKey: String): String {
        return hmacSha256(secret, rawKey)
    }

    fun hashSessionToken(secret: String, rawToken: String): String {
        return hmacSha256(secret, rawToken)
    }

    fun generateRandomToken(bytes: Int = 32): String {
        val random = SecureRandom()
        val tokenBytes = ByteArray(bytes)
        random.nextBytes(tokenBytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes)
    }
}
