# 🩺 Medical Claim Document Text Extractor

A professional-grade web application that enables users to upload scanned **medical insurance claim documents** (PDFs or images) and extracts structured, markdown-formatted data using **Google Gemini AI**.

This tool automates document parsing, significantly reducing manual data entry and improving accuracy in insurance claim workflows.

---

## 📌 Project Highlights

- 🧠 **AI-Powered Parsing**: Utilizes Google Gemini (Generative AI) to intelligently extract relevant fields from claim documents.
- 📄 **Supports PDF & Images**: Automatically converts PDF pages into images for multi-page document processing.
- 📝 **Markdown Output**: Extracted data is presented in well-structured Markdown for readability and export.
- 🔄 **Progressive Feedback**: Real-time upload and processing indicators with success/error notifications.
- 🎨 **Interactive UI**: Built with React and enhanced with Framer Motion for smooth animations and drag-and-drop support.

---

## 🔍 Use Case

> This project was built to address the inefficiencies in processing physical or scanned medical claim documents by automating information extraction for use in **health insurance platforms**, **TPA systems**, or **medical record management**.

---

## 💼 Role & Responsibilities

- Designed and developed the entire frontend in **React.js** with Vite.
- Integrated **Google Generative AI SDK** to extract structured data from image content.
- Handled **PDF rendering** and conversion using `pdfjs-dist`.
- Implemented dynamic markdown rendering with `react-markdown` and GFM tables.
- Developed drag-and-drop upload interface using `react-dropzone`.
- Optimized user experience with **loading indicators**, **multi-page preview**, and **data download/export features**.

---

## 🛠️ Tech Stack

| Technology               | Purpose                                 |
|--------------------------|-----------------------------------------|
| **React + Vite**         | Frontend architecture and tooling       |
| **Google Gemini AI**     | AI model for content extraction         |
| **pdfjs-dist**           | Convert PDF pages to images             |
| **React Dropzone**       | Drag-and-drop file uploads              |
| **Framer Motion**        | UI animations and transitions           |
| **React Markdown + GFM** | Markdown rendering support              |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/medical-claim-extractor.git
cd medical-claim-extractor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory and add your **Google Generative AI API key**:

```
VITE_AI_KEY=your_google_gen_ai_api_key
```

### 4. Run the Application

```bash
npm run dev
```

Then, open your browser and visit: [http://localhost:5173](http://localhost:5173)

---

## 📂 Output Example

The AI returns data in clean markdown format:

```markdown
## 📄 Claim Information
- Claim Number: CLM123456
- Date of Claim: 2024-06-01
- Type of Claim: Reimbursement
- Status: Approved

## 👤 Patient Details
- Full Name: Jane Smith
- Gender: Female
- Age/DOB: 36 / 1988-05-10

## 💵 Billing Breakdown
| # | Item/Service     | Date       | Cost   |
|---|------------------|------------|--------|
| 1 | Consultation Fee | 2024-05-31 | ₹1000  |
| 2 | Medicines        | 2024-05-31 | ₹500   |
```

---

## 🧠 Key Learnings

- Built a real-world integration with **Google Gemini (multimodal LLM)**
- Gained hands-on experience with **PDF-to-image conversion** using `pdfjs-dist`
- Designed a **responsive, animated user experience** using Framer Motion
- Managed complex async workflows for file handling and AI communication
- Applied markdown rendering techniques with GFM support

---

## 📬 Contact

**Gouri Agarwal**  
📧 Email: [gourii.a004@gmail.com]  
🔗 LinkedIn: [https://www.linkedin.com/in/gouri-agarwal-47815a287/]  
💻 GitHub: [https://github.com/Gouri1504](https://github.com/your-username)

---


