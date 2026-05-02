package ru.souz.proxy.http

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.http.content.*
import java.io.File
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.staticRoutes() {
    // Serve old public root for backwards-compatibility (e.g. placeholder page)
    staticFiles("/", File("public")) {
        default("index.html")
        exclude { url -> url.path.startsWith("/app") }
    }

    // /app -> redirect to /app/
    get("/app") {
        call.respondRedirect("/app/")
    }

    // Serve frontend SPA assets from public/app/
    staticFiles("/app", File("public/app"))

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

        val indexFile = File("public/app/index.html")
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

        val file = File("public/index.html")
        if (file.exists()) {
            call.respondFile(file)
        }
    }
}
