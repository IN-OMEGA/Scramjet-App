"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");
/**
 * @type {HTMLDivElement}
 */
const iframeContainer = document.getElementById("iframe-container");
/**
 * @type {HTMLElement}
 */
const browserContainer = document.querySelector(".browser-container");
/**
 * @type {HTMLElement}
 */
const backBtn = document.querySelector('[title="Back"]');
/**
 * @type {HTMLElement}
 */
const forwardBtn = document.querySelector('[title="Forward"]');
/**
 * @type {HTMLElement}
 */
const reloadBtn = document.querySelector('[title="Reload"]');
/**
 * @type {HTMLElement}
 */
const homeBtn = document.querySelector('[title="Home"]');

const { ScramjetController } = $scramjetLoadController();

let currentFrame = null;
let navigationHistory = [];
let historyIndex = -1;

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

// Handle F11 for fullscreen
document.addEventListener("keydown", (event) => {
	if (event.key === "F11") {
		event.preventDefault();
		browserContainer.classList.toggle("fullscreen");
		document.documentElement.classList.toggle("fullscreen-mode");
	}
});

// Back button
backBtn.addEventListener("click", () => {
	if (historyIndex > 0) {
		historyIndex--;
		const prevUrl = navigationHistory[historyIndex];
		navigateToUrl(prevUrl);
	}
});

// Forward button
forwardBtn.addEventListener("click", () => {
	if (historyIndex < navigationHistory.length - 1) {
		historyIndex++;
		const nextUrl = navigationHistory[historyIndex];
		navigateToUrl(nextUrl);
	}
});

// Reload button
reloadBtn.addEventListener("click", () => {
	if (currentFrame && historyIndex >= 0) {
		const currentUrl = navigationHistory[historyIndex];
		navigateToUrl(currentUrl, true);
	}
});

// Home button
homeBtn.addEventListener("click", () => {
	address.value = "";
	iframeContainer.classList.remove("active");
	const existingFrame = iframeContainer.querySelector("iframe");
	if (existingFrame) {
		existingFrame.remove();
	}
	currentFrame = null;
	navigationHistory = [];
	historyIndex = -1;
});

function navigateToUrl(url, isReload = false) {
	if (!isReload) {
		// Only add to history if not reloading
		navigationHistory = navigationHistory.slice(0, historyIndex + 1);
		navigationHistory.push(url);
		historyIndex = navigationHistory.length - 1;
	}
	
	const existingFrame = iframeContainer.querySelector("iframe");
	if (existingFrame) {
		existingFrame.remove();
	}

	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	
	currentFrame = frame;
	iframeContainer.appendChild(frame.frame);
	iframeContainer.classList.add("active");
	address.value = url;
	frame.go(url);
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	const url = search(address.value, searchEngine.value);

	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
		await connection.setTransport("/libcurl/index.mjs", [
			{ websocket: wispUrl },
		]);
	}

	navigateToUrl(url);
});
