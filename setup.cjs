const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Banner
console.log(`
${colors.bright}${colors.magenta}┌───────────────────────────────────────────────────────────────┐${colors.reset}
${colors.bright}${colors.magenta}│                                                               │${colors.reset}
${colors.bright}${colors.magenta}│   ${colors.yellow}███╗   ███╗███████╗████████╗    ███████╗██████╗ ██████╗    ${colors.magenta}│${colors.reset}
${colors.bright}${colors.magenta}│   ${colors.yellow}████╗ ████║██╔════╝╚══██╔══╝    ██╔════╝██╔══██╗██╔══██╗   ${colors.magenta}│${colors.reset}
${colors.bright}${colors.magenta}│   ${colors.yellow}██╔████╔██║█████╗     ██║       █████╗  ██████╔╝██████╔╝   ${colors.magenta}│${colors.reset}
${colors.bright}${colors.magenta}│   ${colors.yellow}██║╚██╔╝██║██╔══╝     ██║       ██╔══╝  ██╔══██╗██╔═══╝    ${colors.magenta}│${colors.reset}
${colors.bright}${colors.magenta}│   ${colors.yellow}██║ ╚═╝ ██║███████╗   ██║       ███████╗██║  ██║██║        ${colors.magenta}│${colors.reset}
${colors.bright}${colors.magenta}│   ${colors.yellow}╚═╝     ╚═╝╚══════╝   ╚═╝       ╚══════╝╚═╝  ╚═╝╚═╝        ${colors.magenta}│${colors.reset}
${colors.bright}${colors.magenta}│                                                               │${colors.reset}
${colors.bright}${colors.magenta}│   ${colors.cyan}QUICK SETUP - SERVER AND DATABASE INITIALIZATION     ${colors.magenta}│${colors.reset}
${colors.bright}${colors.magenta}│                                                               │${colors.reset}
${colors.bright}${colors.magenta}└───────────────────────────────────────────────────────────────┘${colors.reset}
`);

// Path setup
const serverDir = path.join(__dirname, 'server');
const seedsDir = path.join(serverDir, 'seed');

// Run a command with custom options
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`${colors.cyan}⟳ Running command: ${command} ${args.join(' ')}${colors.reset}`);
    
    const childProcess = spawn(command, args, { 
      ...options, 
      shell: true,
      windowsVerbatimArguments: true // This helps with Windows paths
    });
    
    childProcess.on('error', (error) => {
      console.error(`${colors.red}✖ Error executing command: ${error.message}${colors.reset}`);
      reject(error);
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error(`${colors.red}✖ Command failed with exit code: ${code}${colors.reset}`);
        reject(new Error(`Command failed with exit code: ${code}`));
      }
    });
  });
}

// Run a seed file in the server's directory context
async function runSeedFile(seedFile) {
  return new Promise((resolve, reject) => {
    console.log(`${colors.cyan}⟳ Running seed: ${seedFile.name}...${colors.reset}`);
    
    // Use process.chdir to change to the server directory before running the seed
    const originalDir = process.cwd();
    process.chdir(serverDir);
    
    const relativePath = path.relative(serverDir, path.join(seedsDir, seedFile.file));
    
    const childProcess = spawn('node', [relativePath], { 
      stdio: 'inherit',
      shell: true,
      cwd: serverDir
    });
    
    childProcess.on('error', (error) => {
      console.error(`${colors.red}✖ Error running seed: ${error.message}${colors.reset}`);
      process.chdir(originalDir);
      reject(error);
    });
    
    childProcess.on('close', (code) => {
      process.chdir(originalDir);
      if (code === 0) {
        console.log(`${colors.green}✓ ${seedFile.name} seeded successfully${colors.reset}`);
        resolve();
      } else {
        console.log(`${colors.red}✖ Failed to seed ${seedFile.name} with exit code: ${code}${colors.reset}`);
        reject(new Error(`Failed to seed ${seedFile.name} with exit code: ${code}`));
      }
    });
  });
}

// Main setup function
async function setup() {
  try {
    // Check if Node.js and npm are available
    console.log(`${colors.cyan}⟳ Checking Node.js and npm...${colors.reset}`);
    try {
      await runCommand('node', ['--version']);
      await runCommand('npm', ['--version']);
      console.log(`${colors.green}✓ Node.js and npm are available${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✖ Node.js or npm is not available: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}ℹ Please make sure Node.js and npm are installed and in your PATH${colors.reset}`);
      return;
    }
    
    // Install dependencies
    console.log(`${colors.cyan}⟳ Installing server dependencies...${colors.reset}`);
    await runCommand('npm', ['install'], { cwd: serverDir, stdio: 'inherit' });
    console.log(`${colors.green}✓ Server dependencies installed successfully${colors.reset}`);
    
    console.log(`${colors.cyan}⟳ Installing client dependencies...${colors.reset}`);
    await runCommand('npm', ['install'], { cwd: __dirname, stdio: 'inherit' });
    console.log(`${colors.green}✓ Client dependencies installed successfully${colors.reset}`);
    
    // Run the seed files using npx
    console.log(`${colors.yellow}ℹ Now we'll attempt to seed the database${colors.reset}`);
    console.log(`${colors.yellow}ℹ This requires MongoDB to be running at mongodb://127.0.0.1:27017${colors.reset}`);
    console.log(`${colors.yellow}ℹ Press Enter to continue or Ctrl+C to abort${colors.reset}`);
    
    // Wait for user confirmation
    await new Promise(resolve => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question(`${colors.green}Continue with seeding? (Press Enter)${colors.reset} `, () => {
        readline.close();
        resolve();
      });
    });
    
    // Define seed files in order of execution
    const seedFiles = [
      { name: 'Master Data', file: 'seedMasterData.js' },
      { name: 'Education Data', file: 'seedEducationData.js' },
      { name: 'Semesters', file: 'seedSemesters.js' },
      { name: 'Admin Users', file: 'seedAdmin.js' },
      { name: 'Staff Users', file: 'seedStaff.cjs' },
      { name: 'Students', file: 'seedStudent.js' }
    ];
    
    // Execute seed files in sequence, using the new runSeedFile function
    for (const seed of seedFiles) {
      const seedPath = path.join(seedsDir, seed.file);
      
      if (!fs.existsSync(seedPath)) {
        console.log(`${colors.yellow}ℹ Seed file ${seed.file} not found - skipping${colors.reset}`);
        continue;
      }
      
      try {
        await runSeedFile(seed);
      } catch (error) {
        console.log(`${colors.yellow}ℹ Continuing with next seed file...${colors.reset}`);
      }
    }
    
    // Start both servers
    console.log(`${colors.cyan}⟳ Starting both backend and frontend servers...${colors.reset}`);
    
    // Make sure the JWT_SECRET is properly set in the .env file
    const envPath = path.join(serverDir, '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      // Check if JWT_SECRET is set
      if (!envContent.includes('JWT_SECRET=')) {
        console.log(`${colors.yellow}ℹ Adding JWT_SECRET to .env file...${colors.reset}`);
        // Generate a random secret if not set
        const randomSecret = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
        envContent += `\nJWT_SECRET=${randomSecret}\n`;
        fs.writeFileSync(envPath, envContent);
        console.log(`${colors.green}✓ JWT_SECRET added to .env file${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}ℹ Creating .env file with JWT_SECRET...${colors.reset}`);
      const randomSecret = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
      fs.writeFileSync(envPath, `PORT=5000\nJWT_SECRET=${randomSecret}\n`);
      console.log(`${colors.green}✓ .env file created with JWT_SECRET${colors.reset}`);
    }
    
    // Start the backend server first and wait for it to be ready
    console.log(`${colors.green}✓ Starting backend server...${colors.reset}`);
    const serverProcess = spawn('npm', ['start'], {
      cwd: serverDir,
      stdio: 'inherit',
      shell: true,
      detached: true
    });
    
    // Give backend more time to start up completely
    console.log(`${colors.yellow}ℹ Waiting for backend to initialize (this may take a moment)...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 8000)); // Increased to 8 seconds
    
    // Start the frontend server in this process
    console.log(`${colors.green}✓ Starting frontend server...${colors.reset}`);
    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });
    
    // Handle cleanup
    const cleanup = () => {
      console.log(`${colors.yellow}ℹ Shutting down servers...${colors.reset}`);
      if (serverProcess && !serverProcess.killed) {
        try {
          process.kill(-serverProcess.pid);
        } catch (err) {
          // Ignore errors when killing processes
        }
      }
      process.exit(0);
    };
    
    // Handle termination signals
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Print login credentials
    console.log(`
${colors.bright}${colors.green}┌───────────────────────────────────────────────────────────────┐${colors.reset}
${colors.bright}${colors.green}│                    LOGIN CREDENTIALS                          │${colors.reset}
${colors.bright}${colors.green}├───────────────────┬───────────────────┬───────────────────────┤${colors.reset}
${colors.bright}${colors.green}│       Role        │        ID         │       Password        │${colors.reset}
${colors.bright}${colors.green}├───────────────────┼───────────────────┼───────────────────────┤${colors.reset}
${colors.bright}${colors.green}│ ${colors.reset}Admin            ${colors.green}│ ${colors.reset}ADMIN001         ${colors.green}│ ${colors.reset}password            ${colors.green}│${colors.reset}
${colors.bright}${colors.green}│ ${colors.reset}Staff (Regular)  ${colors.green}│ ${colors.reset}STAFF00001       ${colors.green}│ ${colors.reset}password            ${colors.green}│${colors.reset}
${colors.bright}${colors.green}│ ${colors.reset}Staff (TPO)      ${colors.green}│ ${colors.reset}STAFF00004       ${colors.green}│ ${colors.reset}password            ${colors.green}│${colors.reset}
${colors.bright}${colors.green}│ ${colors.reset}Staff (Principal)${colors.green}│ ${colors.reset}STAFF00005       ${colors.green}│ ${colors.reset}password            ${colors.green}│${colors.reset}
${colors.bright}${colors.green}│ ${colors.reset}Student          ${colors.green}│ ${colors.reset}N04112100064     ${colors.green}│ ${colors.reset}password            ${colors.green}│${colors.reset}
${colors.bright}${colors.green}└───────────────────┴───────────────────┴───────────────────────┘${colors.reset}

${colors.cyan}Access the application at: http://localhost:8080${colors.reset}
${colors.cyan}API server running at: http://localhost:5000${colors.reset}
`);
    
    console.log(`
${colors.yellow}ℹ TROUBLESHOOTING TIPS:${colors.reset}
${colors.yellow}ℹ If you see "Token is not valid" errors after login:${colors.reset}
${colors.yellow}ℹ 1. Check that the server/.env file contains proper JWT_SECRET${colors.reset}
${colors.yellow}ℹ 2. Make sure backend and frontend are using the same token format${colors.reset}
${colors.yellow}ℹ 3. Try clearing your browser's local storage and cookies${colors.reset}
${colors.yellow}ℹ 4. Ensure the token expiration time is reasonable (server/middleware/auth.js)${colors.reset}
`);
    
  } catch (error) {
    console.log(`${colors.red}✖ Setup failed: ${error.message}${colors.reset}`);
  }
}

// Run the setup
setup();