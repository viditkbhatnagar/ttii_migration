<?php if (isset($edit_data)): ?>
    <?php
    $answers = json_decode($edit_data['answers'], true);
    $answer_ids = isset($edit_data['answer_ids']) && !empty($edit_data['answer_ids']) ? json_decode($edit_data['answer_ids'], true) : [];
    $is_single_answer = ($edit_data['question_type'] == 0);
    ?>
    
    <div class="card shadow-sm border-0 rounded-4">
        <div class="card-header bg-primary">
            <h4 class="mb-0  text-white">
                <i class="ri-edit-box-line me-2"></i>
                Edit Question
            </h4>
        </div>
        <div class="card-body">
            <form action="<?= base_url('admin/course_new/edit_question/' . $edit_data['id']) ?>" method="post" enctype="multipart/form-data">
                <input type="hidden" name="id" value="<?= $edit_data['id'] ?>">

                <div class="mb-3">
                    <label for="question" class="form-label fw-semibold">Question Text</label>
                    <textarea class="form-control rounded-3 shadow-sm" id="question" name="question" rows="3" required><?= htmlspecialchars($edit_data['question']) ?></textarea>
                    <div class="form-text">Enter your question here</div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-semibold">Question Type</label><br>
                    <div class="btn-group " role="group">
                        <input type="radio" class="btn-check" name="question_type" id="single" value="0" autocomplete="off" <?= ($edit_data['question_type'] == 0) ? 'checked' : '' ?>>
                        <label class="btn btn-outline-primary" for="single">
                            <i class="ri-checkbox-circle-line me-1"></i> Single Answer
                        </label>

                        <input type="radio" class="btn-check" name="question_type" id="multiple" value="1" autocomplete="off" <?= ($edit_data['question_type'] == 1) ? 'checked' : '' ?>>
                        <label class="btn btn-outline-primary" for="multiple">
                            <i class="ri-checkbox-multiple-line me-1"></i> Multiple Answers
                        </label>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label fw-semibold">Answer Options</label>
                    <div id="answer-container">
                        <?php foreach ($answers as $index => $answer): ?>
                            <div class="input-group mb-2 answer-option">
                                <span class="input-group-text bg-light">
                                    <?php if ($is_single_answer): ?>
                                        <input type="radio" name="answer_id" value="<?= $index ?>" <?= ($edit_data['answer_id'] == $index) ? 'checked' : '' ?>>
                                    <?php else: ?>
                                        <input type="checkbox" name="answer_ids[]" value="<?= $index ?>" <?= in_array($index, $answer_ids) ? 'checked' : '' ?>>
                                    <?php endif; ?>
                                </span>
                                <input type="text" class="form-control" name="answers[]" value="<?= htmlspecialchars($answer) ?>" placeholder="Enter answer option">
                                <button type="button" class="btn btn-outline-danger remove-answer" title="Remove this option">
                                    <i class="ri-close-line"></i>
                                </button>
                            </div>
                        <?php endforeach; ?>
                    </div>

                    <button type="button" class="btn btn-outline-success  mt-2" id="add-answer">
                        <i class="ri-add-line me-1"></i> Add Another Option
                    </button>
                    <div class="form-text">At least 2 options are required</div>
                </div>

                <div class="d-flex justify-content-end gap-2 mt-4">
                    <button type="submit" class="btn btn-primary">
                        <i class="ri-save-3-line me-1"></i> Save Question
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
    $(document).ready(function () {
        $('#add-answer').click(function () {
            const container = $('#answer-container');
            const answerCount = $('.answer-option').length;
            const isSingle = $('input[name="question_type"]:checked').val() == '0';

            const newOption = $(`
                <div class="input-group mb-2 answer-option">
                    <span class="input-group-text bg-light">
                        ${isSingle ?
                            `<input type="radio" name="answer_id" value="${answerCount}">` :
                            `<input type="checkbox" name="answer_ids[]" value="${answerCount}">`}
                    </span>
                    <input type="text" class="form-control" name="answers[]" placeholder="Enter answer option">
                    <button type="button" class="btn btn-outline-danger remove-answer" title="Remove this option">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
            `);

            container.append(newOption);
            newOption.find('input[type="text"]').focus();
        });

        $(document).on('click', '.remove-answer', function () {
            if ($('.answer-option').length > 2) {
                $(this).closest('.answer-option').remove();
                $('.answer-option').each(function (index) {
                    $(this).find('input[type="radio"], input[type="checkbox"]').val(index);
                });
            } else {
                alert('You need at least 2 answer options');
            }
        });

        $('input[name="question_type"]').change(function () {
            const isSingle = $(this).val() == '0';
            $('.answer-option').each(function (index) {
                const inputGroup = $(this).find('.input-group-text');
                const isChecked = inputGroup.find('input').is(':checked');
                const newInput = $(isSingle ?
                    `<input type="radio" name="answer_id" value="${index}">` :
                    `<input type="checkbox" name="answer_ids[]" value="${index}">`);
                if (isChecked) newInput.prop('checked', true);
                inputGroup.html(newInput);
            });
        });
    });
    </script>
<?php endif; ?>
