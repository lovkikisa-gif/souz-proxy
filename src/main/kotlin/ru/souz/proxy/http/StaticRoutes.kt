package ru.souz.proxy.http

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.http.content.*
import java.io.File
import java.nio.file.Path
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.staticRoutes(
    publicDir: File = File("public"),
    publicRootDir: File = File("public-root")
) {
    // Serve old public root for backwards-compatibility (e.g. placeholder page)
    get("/") {
        val indexFile = publicRootDir.resolve("index.html")
        if (indexFile.exists()) {
            call.respondFile(indexFile)
        } else {
            call.respond(HttpStatusCode.NotFound)
        }
    }

    staticFiles("/", publicRootDir) {
        exclude { url ->
            val path = url.path
            path.startsWith("/app") ||
                path.startsWith("/auth/") ||
                path.startsWith("/v1/") ||
                path == "/health" ||
                path == "/healthz" ||
                path == "/ready" ||
                path == "/readyz"
        }
    }

    // /app -> redirect to /app/
    get("/app") {
        call.respondRedirect("/app/")
    }

    // SPA fallback for frontend routes under /app/**
    get("/app/{...}") {
        val path = call.request.path()

        // Do not intercept API or health routes
        if (
            path.startsWith("/auth/") ||
            path.startsWith("/v1/") ||
            path == "/health" ||
            path == "/healthz" ||
            path == "/ready" ||
            path == "/readyz"
        ) return@get

        val relativePath = path.removePrefix("/app/").trimStart('/')
        val publicPath = publicDir.toPath().toAbsolutePath().normalize()
        val requestedPath = resolvePublicPath(publicPath, relativePath)
        if (requestedPath != null && requestedPath.toFile().isFile) {
            call.respondFile(requestedPath.toFile())
            return@get
        }

        val indexFile = publicDir.resolve("index.html")
        if (indexFile.exists()) {
            call.respondFile(indexFile)
        } else {
            call.respond(HttpStatusCode.NotFound)
        }
    }

    // Legacy catch-all for non-app routes
    get("{...}") {
        val path = call.request.path()
        if (path.startsWith("/agent")) {
            call.respond(HttpStatusCode.NotFound)
            return@get
        }
        if (path.startsWith("/app")) return@get
        if (
            path.startsWith("/auth/") ||
            path.startsWith("/v1/") ||
            path == "/health" ||
            path == "/healthz" ||
            path == "/ready" ||
            path == "/readyz"
        ) return@get

        val file = publicRootDir.resolve("index.html")
        if (file.exists()) {
            call.respondFile(file)
        } else {
            call.respond(HttpStatusCode.NotFound)
        }
    }
}

private fun resolvePublicPath(publicPath: Path, relativePath: String): Path? {
    if (relativePath.isBlank()) {
        return null
    }
    val resolved = publicPath.resolve(relativePath).normalize()
    return resolved.takeIf { it.startsWith(publicPath) }
}
