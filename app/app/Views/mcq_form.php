<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCQ Generator</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .correct-answer {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
        }
        .question-card {
            margin-bottom: 1.5rem;
            border: 1px solid #dee2e6;
            border-radius: 0.375rem;
        }
        .option-label {
            width: 30px;
            display: inline-block;
            font-weight: bold;
        }
        .custom-gradient {
          background: linear-gradient(45deg, #286937, #0c9c3c,#42ff6e);
        }
    </style>
</head>
<body>
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card shadow main-div">
                    <div class="custom-gradient card-header bg-primary text-white">
                        <h3 class="mb-0">MCQ Generator</h3>
                    </div>
                    <div class="card-body">
                        <form id="mcqForm">
                            <div class="mb-3">
                                <label for="course" class="form-label">Course</label>
                                <select class="form-select" id="course" required>
                                    <option value="" selected disabled>Select Course</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Electrical Engineering">Electrical Engineering</option>
                                    <option value="Medicine">Medicine</option>
                                    <option value="Business Administration">Business Administration</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="subject" class="form-label">Subject</label>
                                <select class="form-select" id="subject" required>
                                    <option value="" selected disabled>Select Subject</option>
                                    <!-- Subjects will be populated via JavaScript -->
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label for="numQuestions" class="form-label">Number of Questions</label>
                                <input type="number" class="form-control" id="numQuestions" min="1" max="20" value="5" required>
                            </div>
                            
                            <button type="submit" class="custom-gradient btn w-100">
                                <span id="submitText" class="text-light">Generate MCQs</span>
                                <div id="spinner" class="spinner-border spinner-border-sm d-none" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </button>
                        </form>
                    </div>
                </div>
                
                <!-- Results Section -->
                <div id="results" class="mt-4 d-none">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4>Generated Questions</h4>
                        <button id="copyBtn" class="btn btn-sm btn-outline-secondary">
                            <i class="bi bi-clipboard"></i> Copy All
                        </button>
                    </div>
                    <div id="questionsContainer"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap Icons -->
    <!--<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">-->
    
    <!--<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>-->
    <script>
        // SUBJECT MAPPING: CREATE A VARIABLE, ASSIGN OBJECT HAVING KEY=COURSE_NAME & VALUE=SUBJECTS
        const subjectMap = {
            "Computer Science": ["Data Structures", "Algorithms", "Database Systems", "Operating Systems"],
            "Electrical Engineering": ["Circuit Theory", "Electromagnetics", "Power Systems", "Control Systems"],
            "Medicine": ["Anatomy", "Physiology", "Pharmacology", "Pathology"],
            "Business Administration": ["Marketing", "Finance", "Operations", "Human Resources"]
        };

        // Dynamic subject dropdown
        // CHANGE ADDEVENT LISTENER
        document.getElementById('course').addEventListener('change', function() {
            const subjectSelect = document.getElementById('subject');
            subjectSelect.innerHTML = '<option value="" selected disabled>Select Subject</option>';
            
            if (this.value) {
                subjectMap[this.value].forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelect.appendChild(option);
                });
            }
        });

        // Form submission
        document.getElementById('mcqForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.querySelector('#mcqForm button');
            const submitText = document.getElementById('submitText');
            const spinner = document.getElementById('spinner');
            
            // Show loading state
            submitBtn.disabled = true;
            submitText.textContent = 'Generating...';
            spinner.classList.remove('d-none');

            try {
                const response = await fetch('<?= site_url('VK_mcq/generate') ?>', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: new URLSearchParams({
                        course: document.getElementById('course').value,
                        subject: document.getElementById('subject').value,
                        numQuestions: document.getElementById('numQuestions').value
                    })
                });

                const data = await response.json();
                
                if (!response.ok || data.status === 'error') {
                    throw new Error(data.message || 'Failed to generate questions');
                }

                document.getElementById('results').classList.remove('d-none');
                renderQuestions(data.questions || []);
                
            } catch (error) {
                alert('Error: ' + error.message);
                console.error(error);
            } finally {
                submitBtn.disabled = false;
                submitText.textContent = 'Generate MCQs';
                spinner.classList.add('d-none');
            }
        });

        function renderQuestions(questions) {
            const container = document.getElementById('questionsContainer');
            container.innerHTML = '';

            if (questions.length === 0) {
                container.innerHTML = '<div class="alert alert-warning">No questions generated.</div>';
                return;
            }

            questions.forEach((q, qIndex) => {
                const card = document.createElement('div');
                card.className = 'question-card card mb-3';
                
                card.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">Q${qIndex + 1}: ${q.question}</h5>
                        <div class="options mt-3">
                            ${q.options.map((option, oIndex) => `
                                <div class="option py-2 ps-3 mb-2 rounded ${oIndex === q.correct_answer ? 'correct-answer' : ''}">
                                    <span class="option-label">${String.fromCharCode(65 + oIndex)}.</span>
                                    ${option}
                                    ${oIndex === q.correct_answer ? ' <span class="badge bg-success">Correct</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // Copy functionality
        document.getElementById('copyBtn')?.addEventListener('click', () => {
            const questions = document.getElementById('questionsContainer').innerText;
            navigator.clipboard.writeText(questions)
                .then(() => alert('Copied to clipboard!'))
                .catch(err => console.error('Failed to copy:', err));
        });
    </script>
</body>
</html>