package ru.souz.proxy.http

import io.ktor.server.http.content.*
import io.ktor.server.routing.*
import java.io.File

fun Route.staticRoutes() {
    // Serve files from 'public' directory
    staticFiles("/", File("public")) {
        default("index.html")
    }
}
