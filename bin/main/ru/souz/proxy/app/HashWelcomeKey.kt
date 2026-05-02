package ru.souz.proxy.app

import ru.souz.proxy.auth.TokenHasher
import kotlin.system.exitProcess

fun main(args: Array<String>) {
    if (args.isEmpty()) {
        System.err.println("Usage: HashWelcomeKey <raw-key> [secret]")
        System.err.println("If secret is not provided, it reads from WELCOME_KEY_SECRET env variable.")
        exitProcess(1)
    }

    val rawKey = args[0]
    val secret = if (args.size > 1) {
        args[1]
    } else {
        System.getenv("WELCOME_KEY_SECRET") ?: run {
            System.err.println("Error: WELCOME_KEY_SECRET environment variable is not set.")
            exitProcess(1)
        }
    }

    val hash = TokenHasher.hashWelcomeKey(secret, rawKey)
    println("Raw Key: $rawKey")
    println("Hash:    $hash")
}
