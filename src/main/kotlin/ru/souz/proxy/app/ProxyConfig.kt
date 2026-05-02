package ru.souz.proxy.app

data class ProxyConfig(
    val host: String = System.getenv("PROXY_HOST") ?: "0.0.0.0",
    val port: Int = System.getenv("PROXY_PORT")?.toIntOrNull() ?: 8080,
    val publicBaseUrl: String = System.getenv("PUBLIC_BASE_URL") ?: "http://localhost:8080",
    val databaseUrl: String = System.getenv("PROXY_DATABASE_URL") ?: throw IllegalArgumentException("PROXY_DATABASE_URL is required"),
    val backendUrl: String = System.getenv("BACKEND_URL") ?: throw IllegalArgumentException("BACKEND_URL is required"),
    val backendProxyToken: String = System.getenv("SOUZ_BACKEND_PROXY_TOKEN") ?: throw IllegalArgumentException("SOUZ_BACKEND_PROXY_TOKEN is required"),
    val sessionHashSecret: String = System.getenv("SESSION_HASH_SECRET") ?: throw IllegalArgumentException("SESSION_HASH_SECRET is required"),
    val welcomeKeySecret: String = System.getenv("WELCOME_KEY_SECRET") ?: throw IllegalArgumentException("WELCOME_KEY_SECRET is required"),
    val cookieName: String = System.getenv("COOKIE_NAME") ?: "souz_session",
    val cookieSecure: Boolean = System.getenv("COOKIE_SECURE")?.toBooleanStrictOrNull() ?: true,
    val sessionTtlDays: Long = System.getenv("SESSION_TTL_DAYS")?.toLongOrNull() ?: 30L,
    val env: String = System.getenv("ENV") ?: "production"
)
