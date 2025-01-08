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

// File path setup
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
	const depFiles = {
		'package.json': 'npm',
		'requirements.txt': 'python',
		'go.mod': 'go',
	};

	for (const [filename, type] of Object.entries(depFiles)) {
		try {
			const content = await fs.readFile(path.join(directory, filename), 'utf8');

			if (filename === 'package.json') {
				const { dependencies: deps, devDependencies } = JSON.parse(content);
				dependencies[type] = { ...deps, ...devDependencies };
			} else if (filename === 'requirements.txt') {
				const deps = {};
				content
					.split('\n')
					.filter((line) => line.trim() && !line.startsWith('#'))
					.forEach((line) => {
						const [name, version] = line.split('==');
						deps[name.trim()] = version?.trim() || 'latest';
					});
				dependencies[type] = deps;
			} else if (filename === 'go.mod') {
				const deps = {};
				content
					.split('\n')
					.filter((line) => line.trim().startsWith('require'))
					.forEach((line) => {
						const dep = line.replace('require', '').trim();
						deps[dep] = 'specified';
					});
				dependencies[type] = deps;
			}
		} catch {
			continue;
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
		},
	];

	let colorOutput = '';
	let plainOutput = '';

	while (queue.length > 0) {
		const { path: currentPath, prefix, depth } = queue.shift();

		try {
			const entries = await fs.readdir(currentPath, { withFileTypes: true });
			const items = entries
				.filter((entry) => {
					if (DEFAULT_EXCLUDES.includes(entry.name)) return false;
					const relativePath = path.relative(baseDir, path.join(currentPath, entry.name));
					return !ignoreRules.ignores(relativePath);
				})
				.sort((a, b) => {
					if (a.isDirectory() === b.isDirectory()) {
						return a.name.localeCompare(b.name);
					}
					return a.isDirectory() ? -1 : 1;
				});

			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				const isLast = i === items.length - 1;
				const fullPath = path.join(currentPath, item.name);
				const linePrefix = prefix + (isLast ? '└── ' : '├── ');
				const nextPrefix = prefix + (isLast ? '    ' : '│   ');

				const emoji = options.emoji ? getEmoji(item.name, item.isDirectory()) + ' ' : '';

				const coloredName = item.isDirectory() ? chalk.blue(item.name + '/') : chalk.white(item.name);
				const plainName = item.name + (item.isDirectory() ? '/' : '');

				let coloredStats = '';
				let plainStats = '';
				if (options.stats) {
					try {
						const stats = await fs.stat(fullPath);
						const sizeStr = ` [${formatSize(stats.size)}]`;
						coloredStats = chalk.gray(sizeStr);
						plainStats = sizeStr;
					} catch {
						const errorStr = ' [error]';
						coloredStats = chalk.red(errorStr);
						plainStats = errorStr;
					}
				}

				colorOutput += `${linePrefix}${emoji}${coloredName}${coloredStats}\n`;
				plainOutput += `${linePrefix}${emoji}${plainName}${plainStats}\n`;

				if (item.isDirectory() && depth < 20) {
					queue.push({
						path: fullPath,
						prefix: nextPrefix,
						depth: depth + 1,
					});
				}
			}
		} catch (error) {
			const errorMsg = `${prefix}Error reading ${currentPath}: ${error.message}\n`;
			colorOutput += chalk.red(errorMsg);
			plainOutput += errorMsg;
		}
	}

	return {
		colorOutput,
		plainOutput,
	};
}
async function generateLLMContext(directory) {
	const projectType = await detectProjectType(directory);
	const ignoreHelper = ignore().add(DEFAULT_EXCLUDES);
	let context = `Project Type: ${projectType}\n\n`;

	const { plainOutput } = await generateStructure(directory, ignoreHelper, directory, {
		emoji: true,
		stats: true,
	});

	context += `Project Structure:\n${plainOutput}\n\n`;

	try {
		const dependencies = await analyzeDependencies(directory);
		if (Object.keys(dependencies).length > 0) {
			context += 'Dependencies:\n\n';
			for (const [type, deps] of Object.entries(dependencies)) {
				context += `${type.toUpperCase()} Dependencies:\n`;
				for (const [name, version] of Object.entries(deps)) {
					context += `- ${name}: ${version}\n`;
				}
				context += '\n';
			}
		}
	} catch {
		context += 'Unable to analyze dependencies.\n';
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
program
	.name('dirgo')
	.description('Directory structure generator with LLM context support')
	.version('1.0.0')
	.option('-i, --interactive', 'Run in interactive mode')
	.option('-e, --no-emoji', 'Disable emojis')
	.option('-c, --copy', 'Copy to clipboard')
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

				if (options.copy) {
					await clipboard.write(context);
					console.log(chalk.green('📋 Context copied to clipboard!'));
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
$ npx projmap                                  # Basic structure
$ npx projmap --stats                         # With statistics

=== LLM Context ===
$ npx projmap --llm-context                   # Generate LLM context
$ npx projmap --llm-context --stats           # LLM context with stats
$ npx projmap --llm-context --copy            # Generate and copy

=== Output Options ===
$ npx projmap -o file -f structure.txt        # Save to file
$ npx projmap -o both                         # Console and file
$ npx projmap --copy                          # Copy to clipboard

=== Customization ===
$ npx projmap --no-emoji                      # Without emojis
$ npx projmap --include-all                   # Include all directories
$ npx projmap --ignore "dist,build"           # Custom ignore patterns

=== Interactive Mode ===
$ npx projmap -i                              # Interactive menu

For full options run:
$ npx projmap --help
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
