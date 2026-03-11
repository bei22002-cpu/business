const nodemailer = require("nodemailer");

// Configure your email settings via environment variables
const EMAIL_USER = process.env.EMAIL_USER || "northstarconsulting@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "";
const EMAIL_RECIPIENT = process.env.EMAIL_RECIPIENT || "northstarconsulting@gmail.com";

async function sendLeadEmail(payload) {
	if (!EMAIL_PASS) {
		console.warn("EMAIL_PASS not configured; storing leads locally only");
		return null;
	}

	try {
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: EMAIL_USER,
				pass: EMAIL_PASS
			}
		});

		const mailOptions = {
			from: EMAIL_USER,
			to: EMAIL_RECIPIENT,
			subject: `NorthStar Consultation Request from ${payload.name}`,
			html: `
				<h2>New Consultation Request</h2>
				<p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
				<p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
				<p><strong>Company:</strong> ${escapeHtml(payload.company || "Not provided")}</p>
				<p><strong>Primary Need:</strong> ${escapeHtml(payload.need)}</p>
				<p><strong>Source:</strong> ${escapeHtml(payload.source)}</p>
				<p><strong>Chat Intake Used:</strong> ${payload.chatIntakeUsed ? "Yes" : "No"}</p>
				<p><strong>Submitted:</strong> ${new Date(payload.submittedAt).toLocaleString()}</p>
				<hr>
				<h3>Context</h3>
				<pre>${escapeHtml(payload.context)}</pre>
			`
		};

		await transporter.sendMail(mailOptions);
		return { mode: "email", success: true };
	} catch (error) {
		console.error("Email send failed:", error);
		return { mode: "email", success: false, error: error.message };
	}
}

function escapeHtml(text) {
	const map = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;"
	};

	return text.replace(/[&<>"']/g, m => map[m]);
}

function validatePayload(payload) {
	const errors = [];

	if (!payload.name || payload.name.length < 2) {
		errors.push("Name is required and must be at least 2 characters.");
	}

	if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
		errors.push("Valid email is required.");
	}

	if (!payload.need) {
		errors.push("Primary need is required.");
	}

	if (!payload.context || payload.context.length < 12) {
		errors.push("Context must be at least 12 characters.");
	}

	return errors;
}

exports.handler = async event => {
	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			body: JSON.stringify({ error: "Method not allowed" })
		};
	}

	if (event.headers["content-type"] !== "application/json") {
		return {
			statusCode: 400,
			body: JSON.stringify({ error: "Content-Type must be application/json" })
		};
	}

	let payload;

	try {
		payload = JSON.parse(event.body);
	} catch (error) {
		return {
			statusCode: 400,
			body: JSON.stringify({ error: "Invalid JSON payload" })
		};
	}

	const validationErrors = validatePayload(payload);

	if (validationErrors.length > 0) {
		return {
			statusCode: 400,
			body: JSON.stringify({ error: "Validation failed", details: validationErrors })
		};
	}

	const emailResult = await sendLeadEmail(payload);

	if (emailResult && !emailResult.success) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				error: "Lead submission could not be sent by email",
				detail: emailResult.error
			})
		};
	}

	return {
		statusCode: 200,
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			success: true,
			message: "Consultation request received",
			mode: emailResult?.mode || "accepted"
		})
	};
};
