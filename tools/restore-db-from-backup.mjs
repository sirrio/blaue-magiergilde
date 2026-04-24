import { createReadStream, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const backupArg = process.argv[2]
const backupPath = path.resolve(repoRoot, backupArg || 'production-backup.sql')
const envPath = path.join(repoRoot, '.env')

if (!existsSync(envPath)) {
  console.error('Missing .env file in project root.')
  process.exit(1)
}

if (!existsSync(backupPath)) {
  console.error(`Backup file not found: ${backupPath}`)
  process.exit(1)
}

const env = parseEnv(readFileSync(envPath, 'utf8'))

if ((env.DB_CONNECTION || 'mysql') !== 'mysql') {
  console.error(`Unsupported DB_CONNECTION "${env.DB_CONNECTION}". This script only supports mysql.`)
  process.exit(1)
}

const databaseName = env.DB_DATABASE
if (!databaseName) {
  console.error('Missing DB_DATABASE in .env')
  process.exit(1)
}

const mysqlCommand = resolveMysqlCommand()
const mysqlArgs = buildMysqlArgs(env)

console.log(`Dropping and recreating database "${databaseName}"...`)
await runCommand(mysqlCommand, mysqlArgs, {
  input: [
    `DROP DATABASE IF EXISTS \`${databaseName}\`;`,
    `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  ].join('\n'),
  env: buildMysqlEnv(env),
})

console.log(`Importing backup from "${path.relative(repoRoot, backupPath)}"...`)
await runCommand(mysqlCommand, [...mysqlArgs, databaseName], {
  stdinStream: createReadStream(backupPath),
  env: buildMysqlEnv(env),
})

console.log('Running migrations...')
await runCommand('php', ['artisan', 'migrate', '--force', '--no-interaction'], {
  cwd: repoRoot,
  env: process.env,
})

console.log('Database restore completed.')

function parseEnv(contents) {
  const values = {}

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    values[key] = value
  }

  return values
}

function buildMysqlArgs(envValues) {
  const args = []

  if (envValues.DB_HOST) {
    args.push(`--host=${envValues.DB_HOST}`)
  }

  if (envValues.DB_PORT) {
    args.push(`--port=${envValues.DB_PORT}`)
  }

  if (envValues.DB_USERNAME) {
    args.push(`--user=${envValues.DB_USERNAME}`)
  }

  return args
}

function buildMysqlEnv(envValues) {
  return {
    ...process.env,
    ...(envValues.DB_PASSWORD ? { MYSQL_PWD: envValues.DB_PASSWORD } : {}),
  }
}

function resolveMysqlCommand() {
  const configured = process.env.MYSQL_EXE || process.env.MYSQL_BIN
  if (configured && existsSync(configured)) {
    return configured
  }

  const candidates = [
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 9.0\\bin\\mysql.exe',
    'C:\\xampp\\mysql\\bin\\mysql.exe',
    'C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\mysql.exe',
  ]

  const existing = candidates.find((candidate) => existsSync(candidate))

  return existing || 'mysql'
}

function runCommand(command, args, options = {}) {
  const {
    cwd = repoRoot,
    env = process.env,
    input = null,
    stdinStream = null,
  } = options
  const useShell = process.platform === 'win32'

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: useShell,
    })

    child.on('error', (error) => {
      reject(new Error(`Failed to start ${command}: ${error.message}`))
    })

    if (input !== null) {
      child.stdin.write(input)
      child.stdin.end()
    } else if (stdinStream) {
      stdinStream.on('error', reject)
      stdinStream.pipe(child.stdin)
    } else {
      child.stdin.end()
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} exited with code ${code}`))
    })
  })
}
