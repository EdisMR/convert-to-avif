const express = require('express');
const sharp = require('sharp');
const app = express();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { uuid } = require('uuidv4');

const port = 3050;

const storage = multer.diskStorage({
	destination: 'uploads/',
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	}
});

const upload = multer({ storage });

app.get('/', (req, res) => {
	/* send basic response. Everything is Ok */
	res.send('Hello World!');
});

app.post('/convert-multiple-files', upload.array('files'), async (req, res) => {
	const files = req.files;
	let processedFiles = [];

	try {
		await Promise.all(
			files.map(async (file) => {

				const imagePath = path.join("uploads", file.filename);
				const randomName = file.originalname.split('.').slice(0, -1).join('.') + '.' + 'avif';
				const imageDestination = path.join("uploads", randomName);

				await sharp(imagePath)
					.rotate()
					.resize({
						width: 500,
						height: 500,
						fit: 'outside',
						withoutEnlargement: true,
						kernel: 'lanczos3',
						background: { r: 0, g: 0, b: 0, alpha: 1 }
					})
					.avif({
						lossless: true,
						quality: 60,
						effort: 9
					})
					.toFile(imageDestination)
					.then((result) => {
						sharp.cache(false);
						if (file.size > 0 && (result.size < file.size)) {
							file.size = result.size;
							file.mimetype = 'image/avif';
							file.filename = randomName;
							file.path = imageDestination;
							file.destination = path.join("uploads");
							fs.promises.unlink(imagePath);
						} else {
							console.log('Not converted - ' + file.filename);
							fs.promises.unlink(imageDestination);
						}
						processedFiles.push(file);
					})
					.catch((error) => {
						sharp.cache(false);
						processedFiles.push(file);
						fs.promises.unlink(imageDestination);
					})
			}))
	} catch (error) {
		console.log({
			'error': error,
			'processedFiles': processedFiles,
			'files': files
		});
	}
	return res.json({ message: 'Process finished. Review console messages' })
});

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});