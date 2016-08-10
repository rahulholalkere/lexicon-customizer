'use strict';

const async = require('async');
const fs = require('fs-extra');
const path = require('path');
const tarball = require('tarball-extract');
const unzip = require('unzip');

const REGISTRY_URL = 'https://registry.npmjs.org';

function installLexicon(version, dest, cb) {
	const fileName = 'lexicon-ux-' + version + '.tgz';

	const fileDestination = path.join(dest, fileName);
	const tarballURL = _getTarballURL('lexicon-ux', fileName);

	_installDependency(tarballURL, fileDestination, path.join(dest, 'lexicon', version), function(err, pkg) {
		const lexiconPath = resolveLexiconPath(version, dest);

		_fixLexiconBaseMain(pkg.srcDir);

		const customDir = path.join(lexiconPath, 'custom');

		try {
			fs.copySync(path.join(__dirname, '../lexicon/custom'), customDir, {
				clobber: false
			});
		}
		catch (err) {
		}

		pkg.customDir = customDir;

		cb(err, pkg);
	});
}

exports.installLexicon = installLexicon;

function installSassDependencies(version, dest, cb) {
	fs.ensureDirSync(dest);

	const series = {
		bourbon: function(cb) {
			_installBourbon(dest, cb);
		},
		lexicon: function(cb) {
			installLexicon(version, dest, cb);
		}
	}

	if (process.platform === 'win32') {
		series.sassBridge = function(cb) {
			_installSassBridge(dest, cb);
		}
	}

	async.parallel(series, cb);
}

exports.installSassDependencies = installSassDependencies;

function resolveLexiconPath(version, dest) {
	return path.join(dest, 'lexicon', version, 'package');
}

exports.resolveLexiconPath = resolveLexiconPath;

function _installBourbon(dest, cb) {
	const fileName = 'bourbon-4.2.7.tgz';

	const fileDestination = path.join(dest, fileName);
	const tarballURL = _getTarballURL('bourbon', fileName);

	_installDependency(tarballURL, fileDestination, path.join(dest, 'bourbon'), cb);
}

function _downloadAndExtractTarball(url, fileDestination, extractionDestination, cb) {
	const pkgPath = path.join(extractionDestination, 'package');

	tarball.extractTarballDownload(url, fileDestination, extractionDestination, {}, function(err, result) {
		const pkg = require(pkgPath);

		cb(err, pkg);
	});
}

function _extractCachedTarball(fileDestination, extractionDestination, cb) {
	const fileName = path.basename(fileDestination);
	const pkgPath = path.join(extractionDestination, 'package');

	tarball.extractTarball(path.join(__dirname, '../tarballs', fileName), extractionDestination, function(err) {
		let pkg;

		if (!err) {
			pkg = require(pkgPath);
		}

		cb(null, pkg);
	});
}

function _fixLexiconBaseMain(srcDir) {
	const filePath = path.join(srcDir, 'scss/lexicon-base/main.scss');

	let fileContent = fs.readFileSync(filePath, {
		encoding: 'utf8'
	});

	if (/variables/.test(fileContent)) {
		return;
	}

	fileContent = fileContent.replace('@import "mixins";', '@import "variables";\n@import "mixins";');

	fs.writeFileSync(filePath, fileContent);
}

function _getTarballURL(packageName, fileName) {
	return REGISTRY_URL + '/' + packageName + '/-/' + fileName;
}

function _installDependency(url, fileDestination, extractionDestination, cb) {
	const pkgPath = path.join(extractionDestination, 'package');

	let pkg;

	try {
		pkg = require(pkgPath);
	}
	catch (err) {
	}

	if (pkg) {
		cb(null, pkg);

		return;
	}

	async.waterfall([
		function(cb) {
			_extractCachedTarball(fileDestination, extractionDestination, cb);
		},
		function(pkg, cb) {
			if (pkg) {
				cb(null, pkg);

				return;
			}

			_downloadAndExtractTarball(url, fileDestination, extractionDestination, cb);
		}
	], cb);
}

function _installSassBridge(dest, cb) {
	const sassBridgePath = path.join(dest, 'sass-bridge');

	if (_isSassBridgeInstalled(sassBridgePath)) {
		cb(null, sassBridgePath);
	}
	else {
		fs.createReadStream(path.join(__dirname, '../tarballs/sass-bridge.zip'))
			.pipe(unzip.Extract({
				path: sassBridgePath
			}))
			.on('error', (err) => {
				cb(err);
			})
			.on('finish', () => {
				cb(null, sassBridgePath);
			});
	}
}

function _isSassBridgeInstalled(sassBridgePath) {
	let sassBridge;

	try {
		sassBridge = require(path.join(sassBridgePath, 'sass_bridge.js'))
	}
	catch (err) {
	}

	if (!sassBridge) {
		return false;
	}

	let stats;

	try {
		stats = fs.statSync(path.join(sassBridgePath, 'node.exe'));
	}
	catch (err) {
	}

	return stats && stats.isFile();
}
