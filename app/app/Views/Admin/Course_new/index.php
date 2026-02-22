<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>
        </div>
    </div>
</div>

<div class="card">
    <div class="card-body">
        <form id="filterForm">
            <div class="row">
                <div class="col-12 col-md-4">
                    <label for="course" class="form-label">Select Course</label>
                    <select class="form-control select2" name="course" id="course" autocomplete="off">
                        <option value="">Select Course</option>
                        <?php foreach($courses as $course){ ?>
                            <option value="<?= $course['id'] ?>" <?= (!empty($selected_course) && $selected_course == $course['id']) ? 'selected' : '' ?>>
                                <?= $course['title'] ?>
                            </option>
                        <?php } ?>
                    </select>
                </div>
                <div class="col-12 col-md-4">
                    <label for="subject" class="form-label">Select Subject</label>
                    <select class="form-control select2" name="subject" id="subject" autocomplete="off">
                        <option value="">Select Subject</option>
                        <?php if (!empty($subjects)): ?>
                            <?php foreach($subjects as $subject): ?>
                                <option value="<?= $subject['id'] ?>" <?= (!empty($selected_subject) && $selected_subject == $subject['id']) ? 'selected' : '' ?>>
                                    <?= $subject['title'] ?>
                                </option>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </select>
                </div>
                <div class="col-12 col-md-4 d-flex align-items-end">
                    <button type="submit" class="btn btn-primary">Filter</button>
                </div>
            </div>
        </form>
    </div>
</div>
<?php if(!empty($selected_course) && !empty($selected_subject)){ ?>
<div class="card mt-4">
    <div class="card-body">
        <h5 class="card-title d-flex align-items-center justify-content-between">
            <!--TAB STARTS HERE-->
            <ul class="nav nav-tabs" id="lessonTabs" role="tablist">
                  <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="lesson-tab" data-bs-toggle="tab" data-bs-target="#lesson" type="button" role="tab">
                      Lessons
                    </button>
                  </li>
                  <li class="nav-item d-none" role="presentation">
                    <button class="nav-link" id="practise-tab" data-bs-toggle="tab" data-bs-target="#practise" type="button" role="tab">
                      Practise
                    </button>
                  </li>
                  <li class="nav-item d-none" role="presentation">
                    <button class="nav-link " id="assignment-tab" data-bs-toggle="tab" data-bs-target="#assignment" type="button" role="tab">
                      Assignment
                    </button>
                  </li>
                  <li class="nav-item d-none" role="presentation">
                    <button class="nav-link " id="question-tab" data-bs-toggle="tab" data-bs-target="#question" type="button" role="tab">
                      Question Bank
                    </button>
                  </li>
                </ul>
            <!--<span>Lessons</span> -->
            <!--<span>-->
            <!--<button class="btn btn-info btn-sm ml-1" onclick="show_small_modal('<?=base_url('admin/lesson/ajax_add/'.$selected_course.'/'.$selected_subject)?>', 'Add Lesson')">-->
            <!--    <i class="mdi mdi-plus"></i> Add Lesson-->
            <!--</button>-->
            <!--</span>-->
        </h5>
        <div class="tab-content mt-3" id="lessonTabsContent">
            <div class="tab-pane fade show active" id="lesson" role="tabpanel" aria-labelledby="lesson-tab">
                <div class="mb-3">
                    <button class="btn btn-info" onclick="show_small_modal('<?=base_url('admin/lesson/ajax_add/'.$selected_course.'/'.$selected_subject)?>', 'Add Lesson')">
                        <i class="mdi mdi-plus"></i> Add Lesson
                    </button>
                </div>
                <?php if (!empty($lessons)){ ?>
                    <div class="accordion" id="lessonsAccordion">
                        <?php foreach($lessons as $lesson): ?>
                            <div class="accordion-item">
                                <h2 class="accordion-header" id="heading<?= $lesson['id'] ?>">
                                    
                                    <button class="accordion-button <?= empty($lesson['lesson_files']) ? 'collapsed' : '' ?>" 
                                            type="button" 
                                            data-bs-toggle="collapse" 
                                            data-bs-target="#collapse<?= $lesson['id'] ?>" 
                                            aria-expanded="<?= !empty($lesson['lesson_files']) ? 'true' : 'false' ?>" 
                                            aria-controls="collapse<?= $lesson['id'] ?>">
                                        <?= $lesson['title'] ?>
                                        <span class="badge bg-primary ms-2"><?= count($lesson['lesson_files']) ?> files</span>
                                    </button>
                                </h2>
                                <div id="collapse<?= $lesson['id'] ?>" 
                                     class="accordion-collapse collapse <?= !empty($lesson['lesson_files']) ? 'show' : '' ?>" 
                                     aria-labelledby="heading<?= $lesson['id'] ?>" 
                                     data-bs-parent="#lessonsAccordion">
                                    <div class="d-flex gap-1 justify-content-center mx-auto my-3 ">
                                        
                                        <a href="javascript::" class="btn btn-outline-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_sort/' . $lesson['id']) ?>', 'Sort Files')">
                                            <i class="mdi mdi-swap-horizontal"></i> Sort
                                        </a>
                                        <a href="javascript::" class="btn btn-outline-primary btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_video/' . $lesson['id']) ?>', 'Add Videos')">
                                            <i class="mdi mdi-plus"></i> Videos
                                        </a>
                                        <a href="javascript::" class="btn btn-outline-warning btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_audio/' . $lesson['id']) ?>', 'Add Audio')">
                                            <i class="mdi mdi-plus"></i> Audio
                                        </a>
                                        <a href="javascript::" class="btn btn-outline-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_article/' . $lesson['id']) ?>', 'Add Article')">
                                            <i class="mdi mdi-plus"></i> Article
                                        </a>
                                        <a href="javascript::" class="btn btn-outline-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_document/' . $lesson['id']) ?>', 'Add Document')">
                                            <i class="mdi mdi-plus"></i> Document
                                        </a>
                                        <a href="javascript::" class="btn btn-outline-secondary btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_quiz/' . $lesson['id']) ?>', 'Add Quiz')">
                                            <i class="mdi mdi-plus"></i> Quiz
                                        </a>
                                         <ul class="list-inline hstack gap-2 mb-0">
                                            <li class="list-inline-item edit" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Edit">
                                                <a onclick="show_small_modal('<?= base_url('admin/lesson/ajax_edit/' . $lesson['id']) ?>', 'Update Lesson')" class="link-success fs-15"><i class="ri-edit-2-line"></i></a>
                                            </li>
                                            <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Remove">
                                                <a href="javascript::void()" onclick="delete_modal('<?= base_url('admin/lesson/delete/' . $lesson['id']) ?>')" class="link-danger fs-15"><i class="ri-delete-bin-line"></i></a>
                                            </li>
                                        </ul>
                                    </div>
                                    <div class="accordion-body">
                                        <?php if (!empty($lesson['lesson_files'])): ?>
                                            <div class="accordion" id="filesAccordion<?= $lesson['id'] ?>">
                                                <?php foreach($lesson['lesson_files'] as $file): ?>
                                                    <div class="accordion-item">
                                                        <h2 class="accordion-header" id="fileHeading<?= $file['id'] ?>">
                                                            
                                                            <button class="accordion-button collapsed bg-light" type="button" 
                                                                    data-bs-toggle="collapse" 
                                                                    data-bs-target="#fileCollapse<?= $file['id'] ?>" 
                                                                    aria-expanded="false" 
                                                                    aria-controls="fileCollapse<?= $file['id'] ?>">
                                                                <?= $file['title'] ?> 
                                                                <?php 
                                                                    // Determine lesson type and badge color
                                                                    $lessonType = '';
                                                                    $badgeColor = 'secondary';
                                                                    
                                                                    if ($file['lesson_type'] === 'video' && $file['lesson_provider'] === 'youtube') {
                                                                        $lessonType = 'YouTube Video';
                                                                        $badgeColor = 'danger';
                                                                    } elseif ($file['lesson_type'] === 'video' && $file['lesson_provider'] === 'vimeo') {
                                                                        $lessonType = 'Vimeo Video';
                                                                        $badgeColor = 'primary';
                                                                    } elseif ($file['attachment_type'] === 'audio') {
                                                                        $lessonType = 'Audio';
                                                                        $badgeColor = 'success';
                                                                    } elseif ($file['attachment_type'] === 'article') {
                                                                        $lessonType = 'Article';
                                                                        $badgeColor = 'info';
                                                                    } elseif ($file['attachment_type'] === 'pdf') {
                                                                        $lessonType = 'Document';
                                                                        $badgeColor = 'warning';
                                                                    } elseif ($file['attachment_type'] === 'quiz') {
                                                                        $lessonType = 'Quiz';
                                                                        $badgeColor = 'dark';
                                                                    } else {
                                                                        $lessonType = ucfirst($file['lesson_type']);
                                                                        $badgeColor = 'secondary';
                                                                    }
                                                                ?>
                                                                <span class="badge bg-<?= $badgeColor ?> ms-2"><?= $lessonType ?></span>
                                                            </button>
                                                            
                                                        </h2>
                                                        <div id="fileCollapse<?= $file['id'] ?>" 
                                                             class="accordion-collapse collapse" 
                                                             aria-labelledby="fileHeading<?= $file['id'] ?>" 
                                                             data-bs-parent="#filesAccordion<?= $lesson['id'] ?>">
                                                            <div class="accordion-body">
                                                                <div class="my-3">
                                                                    <button onclick="show_small_modal('<?=base_url('admin/lesson_files/ajax_edit/'.$file['id'])?>', 'Update Lesson file')"
                                                                            class="btn btn-primary btn-sm float-right" >
                                                                        <i class="mdi mdi-pencil-outline"></i> Edit
                                                                    </button>
                                                                     <button  onclick="delete_modal('<?php echo base_url('admin/lesson_files/delete/'.$file['id']); ?>');" class="btn btn-outline-danger btn-sm float-right" style="margin-left: 10px;">
                                                                        <i class="mdi mdi-window-close"></i> Delete
                                                                    </button>
                                                                </div>
                                                                <?php if ($file['lesson_type'] === 'video' && !empty($file['video_url'])): ?>
                                                                    <div class="ratio ratio-16x9 mb-3">
                                                                        <?php if ($file['lesson_provider'] === 'youtube'): ?>
                                                                            <iframe src="https://www.youtube.com/embed/<?= substr($file['video_url'], strpos($file['video_url'], 'v=') + 2) ?>" 
                                                                                    frameborder="0" 
                                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                                                    allowfullscreen></iframe>
                                                                        <?php elseif ($file['lesson_provider'] === 'vimeo'): ?>
                                                                            <iframe src="https://player.vimeo.com/video/<?= basename($file['video_url']) ?>" 
                                                                                    frameborder="0" 
                                                                                    allow="autoplay; fullscreen" 
                                                                                    allowfullscreen></iframe>
                                                                        <?php endif; ?>
                                                                    </div>
                                                                    <?php if (!empty($file['summary'])): ?>
                                                                        <div class="alert alert-info mt-2">
                                                                            <?= nl2br($file['summary']) ?>
                                                                        </div>
                                                                    <?php endif; ?>
                                                                <?php elseif ($file['attachment_type'] === 'article'): ?>
                                                                    <div class="editor-content">
                                                                        <?= $file['summary'] ?>
                                                                    </div>
                                                                <?php elseif ($file['attachment_type'] === 'pdf' && !empty($file['attachment'])): ?>
                                                                    <div class="d-flex justify-content-center">
                                                                        <iframe src="<?= base_url(get_file($file['attachment'])) ?>" 
                                                                                style="width:100%; height:500px;" 
                                                                                frameborder="0"></iframe>
                                                                    </div>
                                                                <?php elseif ($file['attachment_type'] === 'quiz'): ?>
                                                                    <div class="quiz-container">
                                                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                                                            <h5 class="mb-0">Quiz: <?= $file['title'] ?></h5>
                                                                            <button class="btn btn-primary btn-sm" onclick="show_large_modal('<?=base_url('admin/course_new/ajax_add_question/'.$lesson['id'].'/'.$file['id'])?>', 'Add Quiz Questions')">
                                                                                <i class="ri-add-circle-line"></i> Add Questions
                                                                            </button>
                                                                        </div>
                                                                        
                                                                        <div class="quiz-instructions mb-3">
                                                                            <strong>Instructions:</strong>
                                                                            <div class="alert alert-info">
                                                                                <?= nl2br($file['summary']) ?>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <?php if (!empty($file['practice_questions'])): ?>
                                                                            <div class="quiz-questions-container">
                                                                                <h6 class="mb-3">Quiz Questions (<?= count($file['practice_questions']) ?> questions)</h6>
                                                                                
                                                                                <?php foreach($file['practice_questions'] as $index => $practice): ?>
                                                                                    <div class="card mb-3 shadow-sm">
                                                                                        <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                                                                            <h6 class="mb-0">Question #<?= $index + 1 ?></h6>
                                                                                            <div class="d-flex gap-2 align-items-center">
                                                                                                <span class="badge bg-<?= $practice['question_type'] == 0 ? 'primary' : 'info' ?>">
                                                                                                    <?= $practice['question_type'] == 0 ? 'Single Answer' : 'Multiple Answers' ?>
                                                                                                </span>
                                                                                                <div>
                                                                                                    <a href="javascript::void()" class="btn btn-primary btn-sm me-1" onclick="show_ajax_modal('<?=base_url('admin/course_new/ajax_edit_question/'.$practice['id'])?>', 'Update Question')">
                                                                                                        <i class="ri-pencil-fill"></i>
                                                                                                    </a>
                                                                                                    <a href="javascript::void()" class="btn btn-danger btn-sm" onclick="delete_modal('<?=base_url('admin/course_new/delete_question/'.$practice['id'])?>')">
                                                                                                        <i class="ri-delete-bin-fill"></i>
                                                                                                    </a>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div class="card-body">
                                                                                            <div class="question-text mb-3">
                                                                                                <strong>Question:</strong> <?= htmlspecialchars($practice['question']) ?>
                                                                                            </div>
                                                                                            
                                                                                            <div class="answers-section">
                                                                                                <strong>Options:</strong>
                                                                                                <ul class="list-group list-group-flush mt-2">
                                                                                                    <?php foreach(json_decode($practice['answers']) as $i => $answer): ?>
                                                                                                        <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                                                                                            <span><?= chr(65 + $i) ?>. <?= htmlspecialchars($answer) ?></span>
                                                                                                            <?php if($practice['question_type'] == 0 && $i == $practice['answer_id']): ?>
                                                                                                                <span class="badge bg-success">Correct Answer</span>
                                                                                                            <?php elseif($practice['question_type'] == 1 && in_array($i, json_decode($practice['answer_ids']))): ?>
                                                                                                                <span class="badge bg-success">Correct</span>
                                                                                                            <?php endif; ?>
                                                                                                        </li>
                                                                                                    <?php endforeach; ?>
                                                                                                </ul>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                <?php endforeach; ?>
                                                                            </div>
                                                                        <?php else: ?>
                                                                            <div class="alert alert-warning">
                                                                                <i class="ri-information-line"></i> No questions have been added to this quiz yet. 
                                                                                <a href="javascript::" onclick="show_large_modal('<?=base_url('admin/course_new/ajax_add_quiz/'.$lesson['id'])?>', 'Add Quiz Questions')" class="alert-link">Click here to add questions.</a>
                                                                            </div>
                                                                        <?php endif; ?>
                                                                    </div>
                                                                <?php elseif ($file['attachment_type'] === 'audio' && !empty($file['audio_file'])): ?>
                                                                    <audio controls class="w-100">
                                                                        <source src="<?= base_url(get_file($file['audio_file'])) ?>" type="audio/mpeg">
                                                                        Your browser does not support the audio element.
                                                                    </audio>
                                                                    <?php if (!empty($file['summary'])): ?>
                                                                        <div class="alert alert-info mt-2">
                                                                            <?= nl2br($file['summary']) ?>
                                                                        </div>
                                                                    <?php endif; ?>
                                                                <?php else: ?>
                                                                    <div class="alert alert-warning">
                                                                        No preview available for this file type.
                                                                    </div>
                                                                <?php endif; ?>
                                                            </div>
                                                        </div>
                                                    </div>
                                                <?php endforeach; ?>
                                            </div>
                                        <?php else: ?>
                                            <div class="alert alert-warning">
                                                No files available for this lesson.
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php } else { ?>   
                    <div class="alert alert-warning">
                        No lessons available for this subject.
                    </div>
                <?php }  ?>
            </div>
        
            <div class="tab-pane fade" id="practise" role="tabpanel" aria-labelledby="lesson-tab">
                <?php if(!empty($lessons)){ ?>
                    <ul class="list-group list-group-flush">
                        <?php foreach($lessons as $key => $lesson){ ?>
                            <li class="list-group-item bg-light list-group-item-action d-flex justify-content-between align-items-center fw-semibold text-dark rounded mb-2 border border-0">
                                <div class="w-100">
                                    <div class="w-100 d-flex align-items-center justify-content-between">
                                        <div>
                                            <!-- Accordion button -->
                                            <button class="btn btn-md btn-primary rounded-3 px-2 me-2 lesson-btn" 
                                                    type="button" 
                                                    data-bs-toggle="collapse" 
                                                    data-bs-target="#lessonCollapse<?= $key ?>" 
                                                    aria-expanded="false" 
                                                    aria-controls="lessonCollapse<?= $key ?>">
                                                <i class="ri-pencil-line"></i> Lesson <?= $key ?> :
                                            </button>
                                            <span class="fs-5 mb-0">
                                                <?= $lesson['title'] ?>
                                            </span>
                                        </div>
                                        <button class="btn btn-md btn-outline-primary rounded-3" onclick="show_large_modal('<?=base_url('admin/course_new/ajax_add_quiz/'.$lesson['id'])?>', 'Add Quiz')">
                                            <i class="ri-add-circle-line"></i> Add Practice
                                        </button>
                                    </div>
                                    <!-- Accordion content -->
                                    <div id="lessonCollapse<?= $key ?>" class="accordion-collapse collapse mt-3">
                                        <div class="card card-body">
                                            <?php if(!empty($lesson['lesson_files'])){ ?>
                                                <?php foreach($lesson['lesson_files'] as $key => $lesson_file){ ?>
                                                    <?php if($lesson_file['attachment_type'] == 'quiz' && !empty($lesson_file['practice_questions'])){ ?>
                                                        <div class="practice-questions-container mt-4">
                                                            <h4 class="mb-3">Practice <?= $key+1 ?> <?= $lesson_file['title'] ?></h4>
                                                            
                                                            <?php foreach($lesson_file['practice_questions'] as $index => $practice): ?>
                                                                <div class="card mb-3 shadow-sm">
                                                                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                                                        <h5 class="mb-0">Question #<?= $index + 1 ?></h5>
                                                                        <span class="badge bg-<?= $practice['question_type'] == 0 ? 'primary' : 'info' ?>">
                                                                            <?= $practice['question_type'] == 0 ? 'Single Answer' : 'Multiple Answers' ?>
                                                                        </span>
                                                                    </div>
                                                                    <div class="card-body">
                                                                        <div class="question-text mb-3">
                                                                            <strong>Question:</strong> <?= htmlspecialchars($practice['question']) ?>
                                                                        </div>
                                                                        
                                                                        <div class="answers-section">
                                                                            <strong>Options:</strong>
                                                                            <ul class="list-group list-group-flush mt-2">
                                                                                <?php foreach(json_decode($practice['answers']) as $i => $answer): ?>
                                                                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                                                                        <?= htmlspecialchars($answer) ?>
                                                                                        <?php if($practice['question_type'] == 0 && $i == $practice['answer_id']): ?>
                                                                                            <span class="badge bg-success">Correct Answer</span>
                                                                                        <?php elseif($practice['question_type'] == 1 && in_array($i, json_decode($practice['answer_ids']))): ?>
                                                                                            <span class="badge bg-success">Correct</span>
                                                                                        <?php endif; ?>
                                                                                    </li>
                                                                                <?php endforeach; ?>
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                    <div class="card-footer bg-white d-flex justify-content-end">
                                                                         <a href="javascript::void()" class="btn btn-primary btn-sm me-2" onclick="show_ajax_modal('<?=base_url('admin/course_new/ajax_edit_question/'.$practice['id'])?>', 'Update Question')">
                                                                            <i class="ri-pencil-fill"></i> Edit
                                                                        </a>
                                                                        <a href="javascript::void()" class="btn btn-danger btn-sm" onclick="delete_modal('<?=base_url('admin/course_new/delete_question/'.$practice['id'])?>')">
                                                                            <i class="ri-delete-bin-fill"></i> Delete
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            <?php endforeach; ?>
                                                            
                                                            <?php if(empty($lesson_file['practice_questions'])): ?>
                                                                <div class="alert alert-info">No practice questions added yet.</div>
                                                            <?php endif; ?>
                                                        </div>
                                                        
                                                    <?php }elseif($lesson_file['attachment_type'] != 'quiz'){ ?>
                                                        <?php continue; ?>
                                                    <?php }else{ ?>
                                                        <div class="alert alert-danger">
                                                            Please add questions.
                                                        </div>
                                                    <?php } ?>
                                                <?php } ?>
                                            <?php } else { ?>
                                                <div class="alert alert-warning">
                                                    Please add a practice question.
                                                </div>
                                            <?php } ?>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        <?php } ?>
                    </ul>
                <?php } else { ?>   
                    <div class="alert alert-warning">
                        No practices available for this subject.
                    </div>
                <?php } ?>
            </div>
        
            <div class="tab-pane fade" id="assignment" role="tabpanel" aria-labelledby="lesson-tab">
               <div class="alert alert-warning">
                    No assignments available for this subject.
                </div>
            </div>
            
            <div class="tab-pane fade" id="question" role="tabpanel" aria-labelledby="lesson-tab">
               <div class="d-flex flex-column justify-content-center align-items-center text-center" style="min-height: 50vh;opacity: 0.6;">
                    <div class="d-flex">
                        <i class="ri-settings-line fs-2"></i>
                        <i class="ri-settings-line fs-6"></i>
                    </div>
                  <h2 style="font-size:12px;">We are working on it..</h2>
                </div>
            </div>
        </div>
    </div>
</div>
<?php } else { ?>
    <div class="alert alert-warning">
        Please select a course and subject.
    </div>
<?php } ?>
<script>
    $(document).ready(function() {
        // Initialize select2
        $('.select2').select2();
        
        // If there's a selected course on page load, fetch its subjects
        <?php if (!empty($selected_course)): ?>
            getSubjects(<?= $selected_course ?>);
        <?php endif; ?>

        // Handle course change to load subjects
        $('#course').change(function() {
            var courseId = $(this).val();
            getSubjects(courseId);
        });

        // Handle form submission
        $('#filterForm').submit(function(e) {
            e.preventDefault();
            var subjectId = $('#subject').val();
            if(subjectId) {
                window.location.href = '<?= base_url('admin/course_new/index/') ?>' + subjectId;
            } else {
                // Optional: Handle case when no subject is selected
                window.location.href = '<?= base_url('admin/course_new/index') ?>';
            }
        });
    });

    function getSubjects(courseId) {
        if (!courseId) {
            // Reset subjects if no course is selected
            $('#subject').empty().append('<option value="">Select Subject</option>');
            $('#subject').select2();
            return;
        }

        // Show loading state
        $('#subject').empty().append('<option value="">Loading...</option>');
        $('#subject').select2();

        // Make AJAX request to get subjects
        $.ajax({
            url: '<?= base_url('admin/course_new/get_subjects') ?>',
            method: 'GET',
            data: { course_id: courseId },
            dataType: 'json',
            success: function(response) {
                if (response && response.length > 0) {
                    // Clear existing options
                    $('#subject').empty().append('<option value="">Select Subject</option>');
                    
                    // Add new options from response
                    $.each(response, function(index, subject) {
                        $('#subject').append(
                            $('<option>', {
                                value: subject.id,
                                text: subject.title
                            })
                        );
                    });
                    
                    // Select the subject if it was previously selected
                    <?php if (!empty($selected_subject)): ?>
                        $('#subject').val(<?= $selected_subject ?>).trigger('change');
                    <?php endif; ?>
                } else {
                    $('#subject').empty().append('<option value="">No subjects found</option>');
                }
                
                // Refresh select2 to show new options
                $('#subject').select2();
            },
            error: function(xhr, status, error) {
                console.error('Error fetching subjects:', error);
                $('#subject').empty().append('<option value="">Error loading subjects</option>');
                $('#subject').select2();
            }
        });
    }
</script>