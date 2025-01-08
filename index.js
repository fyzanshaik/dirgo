#!/usr/bin/env node

// Explicitly mark as module
/**
 * @type {import('commander').Command}
 */

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import clipboard from 'clipboardy';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE_EMOJIS = {
	'.js': '📄',
	'.ts': '📄',
	'.jsx': '⚛️ ',
	'.tsx': '⚛️ ',
	'.vue': '🎨',
	'.css': '🎨',
	'.scss': '🎨',
	'.html': '🌐',
	'.md': '📚',
	'.txt': '📝',
	'.json': '⚙️ ',
	'.config.js': '⚙️ ',
	'.env': '🔒',
	'.gitignore': '👁️ ',
	'.png': '🖼️ ',
	'.jpg': '🖼️ ',
	'.svg': '🎨',
	'.sql': '🗄️ ',
	'.csv': '📊',
	'package.json': '📦',
	'go.mod': '📦',
	'requirements.txt': '📦',
	default: '📄',
	folder: '📁',
};

// const CONTEXT_CONFIG = {
// 	dependencyFiles: ['package.json', 'requirements.txt', 'go.mod'],
// };

const DEFAULT_EXCLUDES = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache', '.DS_Store'];

function getEmoji(filename, isDirectory) {
	if (isDirectory) return FILE_EMOJIS.folder;
	if (FILE_EMOJIS[filename]) return FILE_EMOJIS[filename];
	const ext = path.extname(filename);
	return FILE_EMOJIS[ext] || FILE_EMOJIS.default;
}
//This should fix the clipboard copy thing with the emojis
function stripAnsi(string) {
	return string.replace(/\x1B\[\d+m/g, '');
}

function formatSize(bytes) {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function readGitignore(dir) {
	try {
		const content = await fs.readFile(path.join(dir, '.gitignore'), 'utf8');
		return content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));
	} catch {
		return [];
	}
}

async function detectProjectType(directory) {
	try {
		const files = await fs.readdir(directory);
		if (files.includes('package.json')) return 'node';
		if (files.includes('go.mod')) return 'go';
		if (files.includes('requirements.txt') || files.includes('pyproject.toml')) return 'python';
		return 'unknown';
	} catch {
		return 'unknown';
	}
}

async function analyzeDependencies(directory) {
	const dependencies = {};
	//js dependencies
	try {
		const packageJsonPath = path.join(directory, 'package.json');
		const content = await fs.readFile(packageJsonPath, 'utf8');
		const packageJson = JSON.parse(content);

		dependencies.npm = {
			dependencies: packageJson.dependencies || {},
			devDependencies: packageJson.devDependencies || {},
		};
	} catch {
		// console.log('package.json not found or unreadable');
	}
	// Go dependencies
	try {
		const goModPath = path.join(directory, 'go.mod');
		const content = await fs.readFile(goModPath, 'utf8');
		const lines = content.split('\n');

		dependencies.go = {
			version: '',
			dependencies: {},
			indirectDependencies: {},
		};

		let currentSection = null;

		for (const line of lines) {
			const trimmed = line.trim();

			// Get Go version
			if (trimmed.startsWith('go ')) {
				dependencies.go.version = trimmed.split(' ')[1];
				continue;
			}

			// Check if entering require section
			if (trimmed === 'require (') {
				currentSection = 'direct';
				continue;
			}

			// Handle dependencies
			if (trimmed.startsWith('require ')) {
				const parts = trimmed.replace('require ', '').split(' ');
				dependencies.go.dependencies[parts[0]] = parts[1];
				continue;
			}

			// Handle individual dependencies in require block
			if (currentSection === 'direct' && trimmed && trimmed !== ')') {
				const parts = trimmed.split(' ');
				if (parts.length >= 2) {
					const isIndirect = parts.includes('//') && parts.includes('indirect');
					const name = parts[0];
					const version = parts[1];

					if (isIndirect) {
						dependencies.go.indirectDependencies[name] = version;
					} else {
						dependencies.go.dependencies[name] = version;
					}
				}
			}
		}
	} catch {
		// console.log(' go.mod not found or unreadable');
	}

	try {
		const reqPath = path.join(directory, 'requirements.txt');
		const content = await fs.readFile(reqPath, 'utf8');

		dependencies.python = {
			dependencies: {},
		};

		const lines = content.split('\n');
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('#')) {
				// Handle different formats:
				// package==1.0.0
				// package>=1.0.0
				// package~=1.0.0
				// -r other-requirements.txt
				// package[extra]>=1.0.0
				if (!trimmed.startsWith('-r')) {
					const match = trimmed.match(/^([^=<>~\[]+).*?([0-9].*)$/);
					if (match) {
						const [, name, version] = match;
						dependencies.python.dependencies[name.trim()] = version.trim();
					} else {
						dependencies.python.dependencies[trimmed] = 'latest';
					}
				}
			}
		}
	} catch {
		try {
			const pyprojectPath = path.join(directory, 'pyproject.toml');
			const content = await fs.readFile(pyprojectPath, 'utf8');

			const lines = content.split('\n');
			let inDependencies = false;
			dependencies.python = {
				dependencies: {},
			};

			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed.startsWith('[tool.poetry.dependencies]') || trimmed.startsWith('[project.dependencies]')) {
					inDependencies = true;
					continue;
				} else if (trimmed.startsWith('[')) {
					inDependencies = false;
				}

				if (inDependencies && trimmed && !trimmed.startsWith('[')) {
					const [name, version] = trimmed.split('=').map((s) => s.trim());
					if (name && name !== 'python') {
						const cleanVersion = version?.replace(/['"]/g, '').trim() || 'latest';
						dependencies.python.dependencies[name] = cleanVersion;
					}
				}
			}
		} catch {
			// console.log('Neither requirements.txt nor pyproject.toml found');
		}
	}

	return dependencies;
}
async function generateStructure(dir, ignoreRules, baseDir, options) {
	const queue = [
		{
			path: dir,
			prefix: '',
			depth: 0,
			level: 0,
		},
	];

	let colorOutput = '';
	let plainOutput = '';
	const processedPaths = new Set();

	async function processDirectory(currentPath, prefix, depth) {
		try {
			const entries = await fs.readdir(currentPath, { withFileTypes: true });
			// First, get all valid items
			const validItems = entries.filter((entry) => {
				if (DEFAULT_EXCLUDES.includes(entry.name)) return false;
				const relativePath = path.relative(baseDir, path.join(currentPath, entry.name));
				return !ignoreRules.ignores(relativePath);
			});

			// Separate directories and files
			const dirs = validItems.filter((item) => item.isDirectory());
			const files = validItems.filter((item) => !item.isDirectory());

			// Sort directories and files separately
			dirs.sort((a, b) => a.name.localeCompare(b.name));
			files.sort((a, b) => a.name.localeCompare(b.name));

			// Process directories first
			for (let i = 0; i < dirs.length; i++) {
				const item = dirs[i];
				const fullPath = path.join(currentPath, item.name);
				if (processedPaths.has(fullPath)) continue;
				processedPaths.add(fullPath);

				const isLastDir = i === dirs.length - 1 && files.length === 0;
				const linePrefix = prefix + (isLastDir ? '└── ' : '├── ');
				const nextPrefix = prefix + (isLastDir ? '    ' : '│   ');

				const emoji = options.emoji ? getEmoji(item.name, true) + ' ' : '';
				const coloredName = chalk.blue(item.name + '/');
				const plainName = item.name + '/';

				let statsStr = '';
				if (options.stats) {
					try {
						const stats = await fs.stat(fullPath);
						const sizeStr = ` [${formatSize(stats.size)}]`;
						statsStr = chalk.gray(sizeStr);
					} catch {
						statsStr = chalk.red(' [error]');
					}
				}

				colorOutput += `${linePrefix}${emoji}${coloredName}${statsStr}\n`;
				plainOutput += `${linePrefix}${emoji}${plainName}${statsStr}\n`;

				// Process subdirectory immediately
				await processDirectory(fullPath, nextPrefix, depth + 1);
			}

			// Then process files
			for (let i = 0; i < files.length; i++) {
				const item = files[i];
				const fullPath = path.join(currentPath, item.name);
				if (processedPaths.has(fullPath)) continue;
				processedPaths.add(fullPath);

				const isLast = i === files.length - 1;
				const linePrefix = prefix + (isLast ? '└── ' : '├── ');

				const emoji = options.emoji ? getEmoji(item.name, false) + ' ' : '';
				const coloredName = chalk.white(item.name);
				const plainName = item.name;

				let statsStr = '';
				if (options.stats) {
					try {
						const stats = await fs.stat(fullPath);
						const sizeStr = ` [${formatSize(stats.size)}]`;
						statsStr = chalk.gray(sizeStr);
					} catch {
						statsStr = chalk.red(' [error]');
					}
				}

				colorOutput += `${linePrefix}${emoji}${coloredName}${statsStr}\n`;
				plainOutput += `${linePrefix}${emoji}${plainName}${statsStr}\n`;
			}
		} catch (error) {
			const errorMsg = `${prefix}Error reading ${currentPath}: ${error.message}\n`;
			colorOutput += chalk.red(errorMsg);
			plainOutput += errorMsg;
		}
	}

	await processDirectory(dir, '', 0);

	return {
		colorOutput,
		plainOutput,
	};
}
async function generateLLMContext(directory, options = {}) {
	const projectType = await detectProjectType(directory);
	const ignoreHelper = ignore().add(DEFAULT_EXCLUDES);
	let context = `Project Type: ${projectType}\n\n`;

	const { plainOutput } = await generateStructure(directory, ignoreHelper, directory, {
		emoji: options.emoji !== false,
		stats: true,
	});

	context += `Project Structure:\n${plainOutput}\n\n`;

	try {
		const dependencies = await analyzeDependencies(directory);
		if (Object.keys(dependencies).length > 0) {
			context += 'Dependencies:\n\n';

			if (dependencies.go) {
				context += `GO Dependencies:\n`;
				context += `Go Version: ${dependencies.go.version}\n\n`;

				if (Object.keys(dependencies.go.dependencies).length > 0) {
					context += `Direct Dependencies:\n`;
					Object.entries(dependencies.go.dependencies).forEach(([dep, version]) => {
						context += `- ${dep}: ${version}\n`;
					});
					context += '\n';
				}

				if (Object.keys(dependencies.go.indirectDependencies).length > 0) {
					context += `Indirect Dependencies:\n`;
					Object.entries(dependencies.go.indirectDependencies).forEach(([dep, version]) => {
						context += `- ${dep}: ${version}\n`;
					});
					context += '\n';
				}
			}

			if (dependencies.python?.dependencies) {
				context += `PYTHON Dependencies:\n`;
				Object.entries(dependencies.python.dependencies).forEach(([dep, version]) => {
					context += `- ${dep}: ${version}\n`;
				});
				context += '\n';
			}

			if (dependencies.npm) {
				context += `NPM Dependencies:\n`;

				if (dependencies.npm.dependencies) {
					context += `Regular Dependencies:\n`;
					Object.entries(dependencies.npm.dependencies).forEach(([dep, version]) => {
						context += `- ${dep}: ${version}\n`;
					});
					context += '\n';
				}

				if (dependencies.npm.devDependencies) {
					context += `Dev Dependencies:\n`;
					Object.entries(dependencies.npm.devDependencies).forEach(([dep, version]) => {
						context += `- ${dep}: ${version}\n`;
					});
					context += '\n';
				}
			}
		}
	} catch (error) {
		context += `Unable to analyze dependencies: ${error.message}\n`;
	}

	return context;
}
async function quickGenerate(directory = '.', options = {}, spinner = null) {
	try {
		const ignoreHelper = options.ignoreRules || ignore().add(DEFAULT_EXCLUDES);
		const gitignorePatterns = await readGitignore(directory);
		ignoreHelper.add(gitignorePatterns);

		const { colorOutput, plainOutput } = await generateStructure(directory, ignoreHelper, directory, {
			emoji: options.emoji !== false,
			...options,
		});

		if (options.copy) {
			await clipboard.write(plainOutput);
			console.log(chalk.green('📋 Copied to clipboard!'));
		}

		if (options.output === 'file' || options.output === 'both') {
			const filename = options.filename || `structure-${Date.now()}.txt`;
			await fs.writeFile(filename, plainOutput);
			console.log(chalk.green(`✨ Saved to ${filename}`));
		}

		if (options.output !== 'file') {
			console.log('\n' + colorOutput);
		}

		if (spinner) {
			spinner.succeed('Done!');
		}

		return plainOutput;
	} catch (error) {
		if (spinner) {
			spinner.fail('Error generating structure');
		}
		console.error(chalk.red('Error:', error.message));
		process.exit(1);
	}
}

async function interactiveMode() {
	try {
		const mainChoices = [
			new inquirer.Separator('=== Quick Generate ==='),
			{ name: '📄 Generate Basic Structure', value: 'basic' },
			{ name: '📊 Generate with Statistics', value: 'stats' },
			new inquirer.Separator('=== LLM Context ==='),
			{ name: '🤖 Generate LLM Context (with dependencies)', value: 'llm' },
			{ name: '📦 Generate LLM Context + Statistics', value: 'llm-stats' },
			new inquirer.Separator('=== Advanced Options ==='),
			{ name: '⚙️  Configure Settings', value: 'config' },
			{ name: '🎨 Customize Output Format', value: 'customize' },
			{ name: '❌ Exit', value: 'exit' },
		];

		const { action } = await inquirer.prompt([
			{
				type: 'list',
				name: 'action',
				message: 'What would you like to do?',
				choices: mainChoices,
				pageSize: 12,
			},
		]);

		if (action === 'exit') {
			console.log(chalk.yellow('Goodbye! 👋'));
			process.exit(0);
		}

		if (action === 'config') {
			program.commands.find((cmd) => cmd.name() === 'init').action();
			return interactiveMode();
		}

		const baseOptions = await inquirer.prompt([
			{
				type: 'input',
				name: 'dir',
				message: 'Directory to analyze:',
				default: '.',
			},
		]);

		let options = { ...baseOptions };

		if (action === 'customize') {
			const customOptions = await inquirer.prompt([
				{
					type: 'confirm',
					name: 'emoji',
					message: 'Include emojis?',
					default: true,
				},
				{
					type: 'confirm',
					name: 'stats',
					message: 'Show statistics?',
					default: true,
				},
				{
					type: 'confirm',
					name: 'copy',
					message: 'Copy to clipboard?',
					default: true,
				},
				{
					type: 'list',
					name: 'output',
					message: 'Output format:',
					choices: [
						{ name: 'Console', value: 'console' },
						{ name: 'File', value: 'file' },
						{ name: 'Both Console & File', value: 'both' },
					],
				},
				{
					type: 'input',
					name: 'filename',
					message: 'Output filename:',
					default: `project-structure-${Date.now()}.txt`,
					when: (answers) => answers.output !== 'console',
				},
			]);
			options = { ...options, ...customOptions };
		} else {
			options = {
				...options,
				emoji: true,
				copy: true,
				output: 'console',
				stats: ['stats', 'llm-stats'].includes(action),
				llmContext: ['llm', 'llm-stats'].includes(action),
			};
		}

		const spinner = ora('Analyzing project...').start();

		try {
			if (options.llmContext) {
				const context = await generateLLMContext(options.dir);
				spinner.succeed('Analysis complete!');

				if (options.output === 'file') {
					const filename = options.filename || 'project-context.md';
					await fs.writeFile(filename, context);
					console.log(chalk.green(`✨ Context saved to ${filename}`));
				} else {
					console.log('\n' + context);
				}

				if (options.copy) {
					await clipboard.write(context);
					console.log(chalk.green('📋 Copied to clipboard!'));
				}
			} else {
				const ignoreHelper = ignore().add(DEFAULT_EXCLUDES);
				const gitignorePatterns = await readGitignore(options.dir);
				ignoreHelper.add(gitignorePatterns);

				await quickGenerate(
					options.dir,
					{
						...options,
						ignoreRules: ignoreHelper,
					},
					spinner
				);
			}
		} catch (error) {
			spinner.fail('Error analyzing project');
			console.error(chalk.red(error.message));
		}

		const { again } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'again',
				message: 'Would you like to do something else?',
				default: true,
			},
		]);

		if (again) return interactiveMode();
		console.log(chalk.yellow('Goodbye! 👋'));
	} catch (error) {
		console.error(chalk.red('Error:'), error.message);
		process.exit(1);
	}
}

//TODO: Maybe LLM context as -lm try later

program
	.name('dirgo')
	.description('Directory structure generator with LLM context support')
	.version('1.0.0')
	.option('-i, --interactive', 'Run in interactive mode')
	.option('-n, --no-emoji', 'Disable emojis')
	.option('--no-copy', 'Disable automatic clipboard copy')
	.option('-d, --dir <directory>', 'Target directory', '.')
	.option('-o, --output <type>', 'Output type (console/file/both)', 'console')
	.option('-f, --filename <filename>', 'Output filename')
	.option('-s, --stats', 'Show file and directory statistics')
	.option('--llm-context', 'Generate LLM-friendly context with dependencies')
	.option('--include-all', 'Include normally excluded directories like node_modules')
	.option('--ignore <patterns>', 'Additional ignore patterns (comma-separated)')
	.action(async (options) => {
		if (options.interactive) {
			await interactiveMode();
			return;
		}

		const spinner = ora('Analyzing project...').start();
		try {
			if (options.llmContext) {
				const context = await generateLLMContext(options.dir || '.');
				spinner.stop();

				if (options.output === 'file') {
					const filename = options.filename || 'project-context.md';
					await fs.writeFile(filename, context);
					console.log(chalk.green(`✨ Context saved to ${filename}`));
				} else {
					console.log(context);
				}

				if (options.copy !== false) {
					await clipboard.write(context);
					console.log(chalk.green('📋 Copied to clipboard!'));
				}
			} else {
				const ignoreHelper = ignore();
				if (!options.includeAll) {
					ignoreHelper.add(DEFAULT_EXCLUDES);
				}

				const gitignorePatterns = await readGitignore(options.dir || '.');
				ignoreHelper.add(gitignorePatterns);

				await quickGenerate(
					options.dir,
					{
						...options,
						ignoreRules: ignoreHelper,
						copy: options.copy !== false,
					},
					spinner
				);

				spinner.succeed('Analysis complete!');
			}
		} catch (error) {
			spinner.fail('Error analyzing project');
			console.error(chalk.red(error.message));
			process.exit(1);
		}
	});
program
	.command('init')
	.description('Initialize configuration file')
	.action(async () => {
		const config = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'emoji',
				message: 'Enable emojis by default?',
				default: true,
			},
			{
				type: 'confirm',
				name: 'copy',
				message: 'Copy to clipboard by default?',
				default: true,
			},
			{
				type: 'confirm',
				name: 'llmContext',
				message: 'Generate LLM context by default?',
				default: false,
			},
			{
				type: 'input',
				name: 'ignorePatterns',
				message: 'Additional ignore patterns (comma-separated):',
				default: '',
			},
		]);

		await fs.writeFile(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 2));
		console.log(chalk.green('✨ Configuration saved!'));
	});

program
	.command('examples')
	.description('Show usage examples')
	.action(() => {
		console.log(
			chalk.cyan(`
=== Quick Generate ===
$ dirgo                       # Basic structure (auto-copies to clipboard)
$ dirgo -n                    # Without emojis (auto-copies to clipboard)
$ dirgo --no-copy            # Disable clipboard copy
$ dirgo -s                    # With statistics

=== LLM Context ===
$ dirgo --llm-context        # Generate LLM context (auto-copies)
$ dirgo --llm-context -n     # LLM context without emojis
$ dirgo --llm-context --no-copy  # Without clipboard copy

=== Output Options ===
$ dirgo -o file -f struct.txt  # Save to file
$ dirgo -o both                # Console & file
$ dirgo --no-copy -o file     # File only, no clipboard

=== Customization ===
$ dirgo -n -s                  # No emojis, with stats
$ dirgo --include-all          # Include all directories
$ dirgo --ignore "dist,build"  # Custom ignore patterns

=== Interactive Mode ===
$ dirgo -i                     # Interactive menu

For full options run:
$ dirgo --help
    `)
		);
	});
program.parse();

/**
 * async function getQuickDirStats(dirPath) {
	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });
		return {
			files: entries.filter((e) => !e.isDirectory()).length,
			dirs: entries.filter((e) => e.isDirectory()).length,
		};
	} catch {
		return { files: 0, dirs: 0 };
	}
}

async function analyzeCodeFile(filePath, content) {
	const ext = path.extname(filePath);
	const fileSize = (await fs.stat(filePath)).size;
	const lines = content.split('\n');

	const importLines = lines.filter((line) => {
		const trimmed = line.trim();
		return trimmed.startsWith('import ') || trimmed.startsWith('from ') || trimmed.startsWith('require(');
	});

	const exportLines = lines.filter((line) => {
		const trimmed = line.trim();
		return trimmed.startsWith('export ') || trimmed.startsWith('module.exports');
	});

	const functionMatches = content.match(/function\s+\w+\s*\(|const\s+\w+\s*=\s*\(|class\s+\w+/g) || [];

	return {
		type: 'code',
		extension: ext,
		size: formatSize(fileSize),
		lineCount: lines.length,
		imports: importLines.length,
		exports: exportLines.length,
		functions: functionMatches.length,
		preview: content.length > CONTEXT_CONFIG.maxFilePreviewSize ? content.slice(0, CONTEXT_CONFIG.maxFilePreviewSize) + '...' : content,
	};
}


async function getDirectoryStats(dirPath) {
	let totalSize = 0,
		fileCount = 0,
		dirCount = 0;

	async function calculateSize(currentPath) {
		const items = await fs.readdir(currentPath, { withFileTypes: true });

		for (const item of items) {
			const fullPath = path.join(currentPath, item.name);
			if (DEFAULT_EXCLUDES.includes(item.name)) continue;

			if (item.isDirectory()) {
				dirCount++;
				await calculateSize(fullPath);
			} else {
				fileCount++;
				const stats = await fs.stat(fullPath);
				totalSize += stats.size;
			}
		}
	}

	await calculateSize(dirPath);
	return { size: formatSize(totalSize), files: fileCount, directories: dirCount };
}
 */
