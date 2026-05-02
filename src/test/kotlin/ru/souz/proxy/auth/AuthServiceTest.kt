package ru.souz.proxy.auth

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import ru.souz.proxy.db.WelcomeKey
import java.time.Instant

class AuthServiceTest {
    @Test
    fun `welcome key is invalid when it expires exactly now`() {
        val now = Instant.parse("2026-05-02T10:15:30Z")
        val welcomeKey = WelcomeKey(
            id = "welcome-key-id",
            keyHash = "key-hash",
            usedAt = null,
            expiresAt = now
        )

        assertFalse(welcomeKey.isUsableAt(now))
    }

    @Test
    fun `unused welcome key with future expiry is valid`() {
        val now = Instant.parse("2026-05-02T10:15:30Z")
        val welcomeKey = WelcomeKey(
            id = "welcome-key-id",
            keyHash = "key-hash",
            usedAt = null,
            expiresAt = now.plusSeconds(1)
        )

        assertTrue(welcomeKey.isUsableAt(now))
    }

    @Test
    fun `used welcome key is always invalid`() {
        val now = Instant.parse("2026-05-02T10:15:30Z")
        val welcomeKey = WelcomeKey(
            id = "welcome-key-id",
            keyHash = "key-hash",
            usedAt = now.minusSeconds(10),
            expiresAt = now.plusSeconds(10)
        )

        assertFalse(welcomeKey.isUsableAt(now))
    }
}
