package ru.souz.proxy.app

import java.net.URI
import java.time.Duration

data class ProxyConfig(
    val host: String,
    val port: Int,
    val publicBaseUrl: String,
    val databaseUrl: String,
    val backendUrl: String,
    val backendProxyToken: String,
    val sessionHashSecret: String,
    val welcomeKeySecret: String,
    val cookieName: String = "souz_session",
    val cookieSecure: Boolean = true,
    val sessionTtlDays: Long = 30L,
    val env: String = "production",
    val wsMaxFrameSizeBytes: Long = 1024 * 1024,
    val wsPingPeriod: Duration = Duration.ofSeconds(15),
    val wsIdleTimeout: Duration = Duration.ofSeconds(30),
    val wsAllowedOrigins: Set<String> = emptySet(),
    val authRateLimitMaxAttempts: Int = 10,
    val authRateLimitWindow: Duration = Duration.ofMinutes(5),
    val backendRequestTimeout: Duration = Duration.ofSeconds(30)
) {
    val isProduction: Boolean = env.equals("production", ignoreCase = true)
    val normalizedPublicOrigin: String = publicBaseUrl.toOrigin()
    val resolvedWsAllowedOrigins: Set<String> = if (wsAllowedOrigins.isEmpty()) {
        setOf(normalizedPublicOrigin)
    } else {
        wsAllowedOrigins.map { it.toOrigin() }.toSet()
    }

    init {
        require(port in 1..65535) { "PROXY_PORT must be between 1 and 65535." }
        require(sessionTtlDays > 0) { "SESSION_TTL_DAYS must be positive." }
        require(wsMaxFrameSizeBytes in 1024..(16 * 1024 * 1024)) { "WS_MAX_FRAME_SIZE_BYTES must be between 1024 and 16777216." }
        require(!wsPingPeriod.isZero && !wsPingPeriod.isNegative) { "WS_PING_PERIOD_SECONDS must be positive." }
        require(!wsIdleTimeout.isZero && !wsIdleTimeout.isNegative) { "WS_IDLE_TIMEOUT_SECONDS must be positive." }
        require(!authRateLimitWindow.isZero && !authRateLimitWindow.isNegative) { "AUTH_RATE_LIMIT_WINDOW_SECONDS must be positive." }
        require(authRateLimitMaxAttempts > 0) { "AUTH_RATE_LIMIT_MAX_ATTEMPTS must be positive." }
        require(!backendRequestTimeout.isZero && !backendRequestTimeout.isNegative) { "BACKEND_REQUEST_TIMEOUT_SECONDS must be positive." }

        publicBaseUrl.toOrigin()
        backendUrl.toBaseHttpUrl()

        if (isProduction) {
            require(backendProxyToken != "default-dev-proxy-token") {
                "SOUZ_BACKEND_PROXY_TOKEN must not use the default dev token in production."
            }
            require(cookieSecure) { "COOKIE_SECURE must be true in production." }
            require(publicBaseUrl.startsWith("https://")) { "PUBLIC_BASE_URL must use HTTPS in production." }
            requireStrongSecret("SESSION_HASH_SECRET", sessionHashSecret)
            requireStrongSecret("WELCOME_KEY_SECRET", welcomeKeySecret)
        }
    }

    fun isAllowedWebSocketOrigin(originHeader: String?): Boolean {
        if (originHeader.isNullOrBlank()) {
            return false
        }
        return runCatching { originHeader.toOrigin() }
            .map { resolvedWsAllowedOrigins.contains(it) }
            .getOrDefault(false)
    }

    companion object {
        fun fromEnv(env: Map<String, String> = System.getenv()): ProxyConfig {
            return ProxyConfig(
                host = env["PROXY_HOST"] ?: "0.0.0.0",
                port = env["PROXY_PORT"]?.toIntOrNull() ?: 8080,
                publicBaseUrl = env["PUBLIC_BASE_URL"] ?: "http://localhost:8080",
                databaseUrl = env["PROXY_DATABASE_URL"] ?: throw IllegalArgumentException("PROXY_DATABASE_URL is required"),
                backendUrl = env["BACKEND_URL"] ?: throw IllegalArgumentException("BACKEND_URL is required"),
                backendProxyToken = env["SOUZ_BACKEND_PROXY_TOKEN"]
                    ?: throw IllegalArgumentException("SOUZ_BACKEND_PROXY_TOKEN is required"),
                sessionHashSecret = env["SESSION_HASH_SECRET"]
                    ?: throw IllegalArgumentException("SESSION_HASH_SECRET is required"),
                welcomeKeySecret = env["WELCOME_KEY_SECRET"]
                    ?: throw IllegalArgumentException("WELCOME_KEY_SECRET is required"),
                cookieName = env["COOKIE_NAME"] ?: "souz_session",
                cookieSecure = env["COOKIE_SECURE"]?.toBooleanStrictOrNull() ?: true,
                sessionTtlDays = env["SESSION_TTL_DAYS"]?.toLongOrNull() ?: 30L,
                env = env["ENV"] ?: "production",
                wsMaxFrameSizeBytes = env["WS_MAX_FRAME_SIZE_BYTES"]?.toLongOrNull() ?: 1024 * 1024,
                wsPingPeriod = Duration.ofSeconds(env["WS_PING_PERIOD_SECONDS"]?.toLongOrNull() ?: 15L),
                wsIdleTimeout = Duration.ofSeconds(env["WS_IDLE_TIMEOUT_SECONDS"]?.toLongOrNull() ?: 30L),
                wsAllowedOrigins = env["WS_ALLOWED_ORIGINS"]
                    ?.split(",")
                    ?.map { it.trim() }
                    ?.filter { it.isNotEmpty() }
                    ?.toSet()
                    ?: emptySet(),
                authRateLimitMaxAttempts = env["AUTH_RATE_LIMIT_MAX_ATTEMPTS"]?.toIntOrNull() ?: 10,
                authRateLimitWindow = Duration.ofSeconds(env["AUTH_RATE_LIMIT_WINDOW_SECONDS"]?.toLongOrNull() ?: 300L),
                backendRequestTimeout = Duration.ofSeconds(env["BACKEND_REQUEST_TIMEOUT_SECONDS"]?.toLongOrNull() ?: 30L)
            )
        }
    }
}

private fun requireStrongSecret(name: String, value: String) {
    val weakValues = setOf(
        "change-me",
        "changeme",
        "default",
        "secret",
        "dev-secret",
        "test-secret",
        "password",
        "short-secret"
    )
    require(value.length >= 32 && value.lowercase() !in weakValues && value.toSet().size >= 8) {
        "$name must be a strong random secret at least 32 characters long."
    }
}

private fun String.toOrigin(): String {
    val uri = URI(this)
    val scheme = uri.scheme?.lowercase() ?: throw IllegalArgumentException("URL must include a scheme: $this")
    val host = uri.host ?: throw IllegalArgumentException("URL must include a host: $this")
    require(scheme == "http" || scheme == "https") { "URL must use http or https: $this" }
    val portSuffix = when {
        uri.port == -1 -> ""
        uri.port == 80 && scheme == "http" -> ""
        uri.port == 443 && scheme == "https" -> ""
        else -> ":${uri.port}"
    }
    return "$scheme://$host$portSuffix"
}

private fun String.toBaseHttpUrl(): String {
    val origin = toOrigin()
    return if (endsWith("/")) origin else trimEnd('/')
}
