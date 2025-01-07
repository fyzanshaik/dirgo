#!/usr/bin/env node
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

const CONTEXT_CONFIG = {
	maxFilePreviewSize: 1024 * 10,
	maxFilesToAnalyze: 100,
	codeFileTypes: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.go', '.rs'],
	docFileTypes: ['.md', '.txt', '.doc', '.pdf'],
	dependencyFiles: ['package.json', 'requirements.txt', 'go.mod', 'Cargo.toml', 'pom.xml'],
};

const DEFAULT_EXCLUDES = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache', '.DS_Store'];

function getEmoji(filename, isDirectory) {
	if (isDirectory) return FILE_EMOJIS.folder;
	if (FILE_EMOJIS[filename]) return FILE_EMOJIS[filename];
	const ext = path.extname(filename);
	return FILE_EMOJIS[ext] || FILE_EMOJIS.default;
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

async function analyzeDependencies(projectPath) {
	const dependencies = {};

	for (const depFile of CONTEXT_CONFIG.dependencyFiles) {
		const filePath = path.join(projectPath, depFile);
		try {
			const content = await fs.readFile(filePath, 'utf8');

			switch (depFile) {
				case 'package.json': {
					const pkg = JSON.parse(content);
					dependencies.npm = {
						...pkg.dependencies,
						...pkg.devDependencies,
					};
					break;
				}
				case 'requirements.txt': {
					const lines = content.split('\n');
					dependencies.python = {};
					for (const line of lines) {
						if (line.trim() && !line.startsWith('#')) {
							const [name, version] = line.split('==');
							dependencies.python[name.trim()] = version?.trim() || 'latest';
						}
					}
					break;
				}
				case 'go.mod': {
					const lines = content.split('\n');
					dependencies.go = {};
					for (const line of lines) {
						if (line.startsWith('require')) {
							dependencies.go[line.replace('require', '').trim()] = 'specified';
						}
					}
					break;
				}
			}
		} catch {
			continue;
		}
	}
	return dependencies;
}

async function generateStructure(dir, prefix = '', isLast = true, ignoreRules, baseDir, options) {
	const items = await fs.readdir(dir, { withFileTypes: true });
	let output = '';

	const filteredItems = items
		.filter((item) => !ignoreRules.ignores(path.relative(baseDir, path.join(dir, item.name))))
		.sort((a, b) => {
			if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
			return a.isDirectory() ? -1 : 1;
		});

	for (let i = 0; i < filteredItems.length; i++) {
		const item = filteredItems[i];
		const isLastItem = i === filteredItems.length - 1;
		const fullPath = path.join(dir, item.name);

		const linePrefix = prefix + (isLastItem ? '└── ' : '├── ');
		const nextPrefix = prefix + (isLastItem ? '    ' : '│   ');
		const emoji = options.emoji ? getEmoji(item.name, item.isDirectory()) + ' ' : '';
		const itemName = item.isDirectory() ? chalk.blue(item.name + '/') : chalk.white(item.name);

		let statsString = '';
		if (options.stats) {
			try {
				if (item.isDirectory()) {
					const dirStats = await getDirectoryStats(fullPath);
					statsString = chalk.gray(` [${dirStats.files} files, ${dirStats.directories} dirs, ${dirStats.size}]`);
				} else {
					const stats = await fs.stat(fullPath);
					statsString = chalk.gray(` [${formatSize(stats.size)}]`);
				}
			} catch {
				statsString = chalk.red(' [error reading stats]');
			}
		}

		output += linePrefix + emoji + itemName + statsString + '\n';

		if (item.isDirectory()) {
			output += await generateStructure(fullPath, nextPrefix, isLastItem, ignoreRules, baseDir, options);
		}
	}
	return output;
}

async function generateLLMContext(directory) {
	const projectType = await detectProjectType(directory);
	const ignoreHelper = ignore().add(DEFAULT_EXCLUDES);
	let context = `Project Type: ${projectType}\n\n`;

	const structure = await generateStructure(directory, '', true, ignoreHelper, directory, {
		emoji: true,
		stats: true,
	});

	context += `Project Structure:\n${structure}\n\n`;

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

		const structure = await generateStructure(directory, '', true, ignoreHelper, directory, {
			emoji: options.emoji !== false,
			...options,
		});

		if (options.copy) {
			await clipboard.write(structure);
			console.log(chalk.green('📋 Copied to clipboard!'));
		}

		if (options.output === 'file' || options.output === 'both') {
			const filename = options.filename || `project-structure-${Date.now()}.txt`;
			await fs.writeFile(filename, structure);
			console.log(chalk.green(`✨ Saved to ${filename}`));
		}

		if (options.output !== 'file') {
			console.log('\n' + structure);
		}

		if (spinner) {
			spinner.succeed('Done!');
		}

		return structure;
	} catch (error) {
		if (spinner) {
			spinner.fail('Error generating structure');
		}
		console.error(chalk.red(error.message));
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
			// Default options for quick actions
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
