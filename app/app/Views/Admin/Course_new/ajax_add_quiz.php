<!-- Include CKEditor CDN -->
<form action="<?= base_url('admin/course_new/add_quiz/'.$lesson_id) ?>" method="post" id="quiz-form">
<div class="card ">
  <div class="card-body">
    
    <!-- PART 1: Title & Instructions -->
    <div id="part-1">
      <div class="mb-3">
        <label class="form-label">Quiz Title</label>
        <input type="text" class="form-control" id="quiz-title" name="title" placeholder="Enter Quiz Title" required>
        <input type="hidden" id="lesson_type" name="lesson_type" value="other">
        <input type="hidden" id="attachment_type" name="attachment_type" value="quiz">
      </div>

      <div class="mb-4">
        <label class="form-label">Instructions</label>
        <textarea class="form-control" id="editor" name="editor"></textarea>
      </div>

      <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-primary" id="go-to-questions">Next</button>
      </div>
    </div>

    <!-- PART 2: Question Builder -->
    <div id="part-2" style="display: none;">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5>Questions</h5>
        <button type="button" class="btn btn-success" id="add-question">+ Add Question</button>
      </div>

      <div id="question-list"></div>

      <div class="d-flex justify-content-between mt-4">
        <button type="button" class="btn btn-outline-secondary" id="go-back">← Back</button>
        <div>
          <button type="button" class="btn btn-outline-secondary me-2" id="prev-question">Previous</button>
          <button type="button" class="btn btn-primary" id="next-question">Next Question</button>
          <button type="submit" class="btn btn-success ms-2" id="submit-quiz">Save Quiz</button>
        </div>
      </div>
    </div>
  </div>
</div>
</form>

<script>
  let editor;

ClassicEditor
  .create(document.querySelector('#editor'))
  .then(instance => {
    editor = instance; // Store the editor instance
  })
  .catch(error => {
    console.error(error);
  });

  // Step navigation
  document.getElementById('go-to-questions').addEventListener('click', () => {
    document.getElementById('part-1').style.display = 'none';
    document.getElementById('part-2').style.display = 'block';
  });

  document.getElementById('go-back').addEventListener('click', () => {
    document.getElementById('part-1').style.display = 'block';
    document.getElementById('part-2').style.display = 'none';
  });

  // Question Logic
  let questions = [];
  let currentIndex = -1;
  let labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  function renderQuestion(index) {
    const container = document.getElementById('question-list');
    container.innerHTML = '';
    if (index < 0 || !questions[index]) return;
    container.appendChild(questions[index].element);
    toggleOptionType(index);
  }

  function createQuestion(index) {
    let qElem = document.createElement('div');
    qElem.className = 'card  mb-4';
    qElem.innerHTML = `
      <div class="card-body">
        <div class="mb-3">
          <label class="form-label">Question No. ${index + 1}</label>
          <input type="text" class="form-control question-text" placeholder="Enter your question" required>
        </div>
        <div class="btn-group mb-3" role="group">
          <input type="radio" class="btn-check question-type" name="question_type_${index}" id="single_${index}" value="single" checked>
          <label class="btn btn-outline-primary" for="single_${index}">Single Choice</label>

          <input type="radio" class="btn-check question-type" name="question_type_${index}" id="multiple_${index}" value="multiple">
          <label class="btn btn-outline-primary" for="multiple_${index}">Multiple Choice</label>
        </div>
        <div class="option-container" id="options_${index}"></div>
        <button type="button" class="btn btn-link text-decoration-none add-option" data-index="${index}">+ Add Option</button>
      </div>
    `;

    const question = {
      element: qElem,
      type: 'single',
      optionsCount: 0
    };

    // Add Option Handler
    qElem.querySelector('.add-option').addEventListener('click', function () {
      addOption(index);
    });

    // Type Toggle Handler
    qElem.querySelectorAll('.question-type').forEach(radio => {
      radio.addEventListener('change', () => {
        question.type = radio.value;
        toggleOptionType(index);
      });
    });

    questions.push(question);
    addOption(index);
    addOption(index);
    return question;
  }

  function addOption(qIndex) {
    const question = questions[qIndex];
    const optionContainer = question.element.querySelector(`#options_${qIndex}`);
    const label = labels[question.optionsCount];
    const inputType = question.type === 'multiple' ? 'checkbox' : 'radio';

    const row = document.createElement('div');
    row.className = 'row align-items-center mb-2 option-row';
    row.innerHTML = `
      <div class="col-auto"><strong>${label}</strong></div>
      <div class="col">
        <input type="text" class="form-control" placeholder="Option ${label}" required>
      </div>
      <div class="col-auto">
        <input type="${inputType}" name="correct_${qIndex}" class="form-check-input correct-option">
        <label class="form-check-label text-primary ms-1">Right Answer</label>
      </div>
      <div class="col-auto">
        <button type="button" class="btn btn-sm btn-outline-danger remove-option">✕</button>
      </div>
    `;

    row.querySelector('.remove-option').addEventListener('click', () => {
      row.remove();
      question.optionsCount--;
    });

    optionContainer.appendChild(row);
    question.optionsCount++;
  }

  function toggleOptionType(qIndex) {
    const question = questions[qIndex];
    const type = question.element.querySelector(`input[name="question_type_${qIndex}"]:checked`).value;
    const allOptionInputs = question.element.querySelectorAll('.correct-option');

    allOptionInputs.forEach(input => {
      input.type = (type === 'multiple') ? 'checkbox' : 'radio';
    });
  }

  document.getElementById('add-question').addEventListener('click', () => {
    const newQuestion = createQuestion(questions.length);
    currentIndex = questions.length - 1;
    renderQuestion(currentIndex);
  });

  document.getElementById('next-question').addEventListener('click', () => {
    if (currentIndex < questions.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
    }
  });

  document.getElementById('prev-question').addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderQuestion(currentIndex);
    }
  });

  // Updated form submission handler
document.getElementById('quiz-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  // Collect all questions data
  const questionsData = [];
  let isValid = true;
  
  // Validate main fields
  const title = document.getElementById('quiz-title').value;
  const editorContent = editor ? editor.getData() : ''; // Safe access to editor content
  
  if (!title || !editorContent) {
      alert('Please fill in all required fields');
      return;
  }
  
  questions.forEach((question, qIndex) => {
      const questionText = question.element.querySelector('.question-text').value;
      const questionType = question.element.querySelector(`input[name="question_type_${qIndex}"]:checked`).value;
      const optionRows = question.element.querySelectorAll('.option-row');
      
      const options = [];
      let hasCorrectAnswer = false;
      
      optionRows.forEach(row => {
          const optionText = row.querySelector('input[type="text"]').value;
          const isCorrect = row.querySelector('.correct-option').checked;
          
          if (isCorrect) hasCorrectAnswer = true;
          
          options.push({
              text: optionText,
              is_correct: isCorrect
          });
      });
      
      // Validate question
      if (!questionText || options.length < 2 || !hasCorrectAnswer) {
          isValid = false;
          alert(`Question ${qIndex + 1} is incomplete. Each question needs at least 2 options and one correct answer.`);
          return;
      }
      
      questionsData.push({
          text: questionText,
          type: questionType,
          options: options
      });
  });
  
  if (!isValid) return;
  
  // Create hidden input for questions
  const questionsInput = document.createElement('input');
  questionsInput.type = 'hidden';
  questionsInput.name = 'questions';
  questionsInput.value = JSON.stringify(questionsData);
  this.appendChild(questionsInput);
  
  // Submit the form
  this.submit();
});


  // Add one question initially
  document.getElementById('add-question').click();
</script>