package ru.souz.proxy.db

import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ProxySchemaContractTest {
    @Test
    fun `proxy schema stays limited to auth users welcome keys and sessions`() {
        val migrationsDir = Path.of("src/main/resources/db/migration")
        val combinedSql = Files.list(migrationsDir).use { paths ->
            paths
                .filter { Files.isRegularFile(it) }
                .map { Files.readString(it) }
                .toList()
                .joinToString(separator = "\n")
                .lowercase()
        }

        assertTrue("create table users" in combinedSql)
        assertTrue("create table welcome_keys" in combinedSql)
        assertTrue("create table sessions" in combinedSql)
        assertFalse("onboarding" in combinedSql)
        assertFalse("provider_keys" in combinedSql)
        assertFalse("settings_json" in combinedSql)
    }
}
