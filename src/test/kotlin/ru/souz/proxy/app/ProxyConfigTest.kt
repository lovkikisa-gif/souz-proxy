package ru.souz.proxy.app

import kotlin.test.Test
import kotlin.test.assertFailsWith

class ProxyConfigTest {
    @Test
    fun `non-test config rejects default dev proxy token`() {
        assertFailsWith<IllegalArgumentException> {
            ProxyConfig.fromEnv(
                developmentEnv(
                    "SOUZ_BACKEND_PROXY_TOKEN" to "default-dev-proxy-token"
                )
            )
        }
    }

    @Test
    fun `production config rejects default dev proxy token`() {
        assertFailsWith<IllegalArgumentException> {
            ProxyConfig.fromEnv(
                productionEnv(
                    "SOUZ_BACKEND_PROXY_TOKEN" to "default-dev-proxy-token"
                )
            )
        }
    }

    @Test
    fun `production config rejects weak session hash secret`() {
        assertFailsWith<IllegalArgumentException> {
            ProxyConfig.fromEnv(
                productionEnv(
                    "SESSION_HASH_SECRET" to "change-me"
                )
            )
        }
    }

    @Test
    fun `production config rejects weak welcome key secret`() {
        assertFailsWith<IllegalArgumentException> {
            ProxyConfig.fromEnv(
                productionEnv(
                    "WELCOME_KEY_SECRET" to "short-secret"
                )
            )
        }
    }

    @Test
    fun `production config rejects insecure cookie transport settings`() {
        assertFailsWith<IllegalArgumentException> {
            ProxyConfig.fromEnv(
                productionEnv(
                    "COOKIE_SECURE" to "false"
                )
            )
        }

        assertFailsWith<IllegalArgumentException> {
            ProxyConfig.fromEnv(
                productionEnv(
                    "PUBLIC_BASE_URL" to "http://proxy.example.test"
                )
            )
        }
    }

    private fun productionEnv(vararg overrides: Pair<String, String>): Map<String, String> {
        return mapOf(
            "PROXY_HOST" to "0.0.0.0",
            "PROXY_PORT" to "8080",
            "PUBLIC_BASE_URL" to "https://proxy.example.test",
            "PROXY_DATABASE_URL" to "jdbc:postgresql://localhost:5432/souz_proxy",
            "BACKEND_URL" to "http://backend.internal:8080",
            "SOUZ_BACKEND_PROXY_TOKEN" to "proxy-token-0123456789abcdef0123456789abcdef",
            "SESSION_HASH_SECRET" to "session-secret-0123456789abcdef0123456789",
            "WELCOME_KEY_SECRET" to "welcome-secret-0123456789abcdef012345678",
            "COOKIE_NAME" to "souz_session",
            "COOKIE_SECURE" to "true",
            "SESSION_TTL_DAYS" to "30",
            "ENV" to "production"
        ) + overrides
    }

    private fun developmentEnv(vararg overrides: Pair<String, String>): Map<String, String> {
        return productionEnv(
            "PUBLIC_BASE_URL" to "http://localhost:8080",
            "COOKIE_SECURE" to "false",
            "ENV" to "development",
            *overrides
        )
    }
}
