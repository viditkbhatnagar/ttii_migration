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
<div class="row">
    <div class="col-xl-8 mx-auto">
        <div class="card text-secondly on-hover-action mb-5" id="section-51">
            <div class="card-body">
                <h5 class="card-title" style="min-height: 35px;">
                    <span class="font-weight-light"> Lesson Files -</span> <?=$lesson_title ?? ''?>
                    <div class="float-end">
                        
                        <a href="<?php echo site_url('admin/course/details/'.$course_id); ?>" class="alignToTitle btn btn-outline-secondary btn-rounded btn-sm"> <i class=" mdi mdi-keyboard-backspace"></i> Back to Course</a>
                    </div>
                    </h5>
                <div class="clearfix"></div>
                <?php
                    $task_type = ['1' => 'Reading', '2' => 'Writing', '3' => 'Listening', '4' => 'Speaking']
                ?>
<div class="col-md-12">
    <!-- Portlet card -->
    <?php
        $pdf_count      = 0;
        $video_count    = 0;
        $quiz_count     = 0;
        $item_no        = 0;
        
        $backgroundColors = array("beige", "aliceblue");
        
        // Group lesson files by parent_file_id
        $grouped_files = [];
        foreach ($list_items as $key => $lesson_file) {
            $grouped_files[$lesson_file['parent_file_id']][] = $lesson_file;
        }

        foreach ($list_items as $key => $lesson_file) {
            // Skip already displayed videos, PDFs, and quizzes will be grouped by parent_file_id
            if ($lesson_file['parent_file_id'] !== null) {
                continue;
            }

            $backgroundColor = $backgroundColors[$key % count($backgroundColors)];

            // Determine lesson type and icon
            if ($lesson_file['lesson_type'] == 'video') {
                $video_count++;
                $item_no = $video_count;
                $lesson_type = 'Video';
                $lesson_icon = 'mdi mdi-video';
            } else {
                // For PDFs and quizzes, skip to the next iteration
                continue;
            }

            ?>
            <div class="card text-secondary on-hover-action mb-3" id="lesson-<?=$lesson_file['id']?>" style="background-color: <?=$backgroundColor?> !important;">
                <div class="card-body thinner-card-body">
                    <h5 class="card-title mb-2">
                        <span class="font-weight-light" style="font-size: 16px;">
                            <i class="<?=$lesson_icon?>"></i> <?=$lesson_type?> <?=$item_no?>
                        </span>: <span style="font-size: 20px;"><?=$lesson_file['title']?></span><br><br>

                        <div class="text-end">
                            <?php if ($lesson_file['is_practice'] == 1) { ?>
                                <span class="badge badge-primary text-muted mb-0" style="font-size: 12px;">Practice</span>
                            <?php } ?>
                        </div>

                        <div class="mb-1">
                            <span class="font-weight-light" style="font-size: 14px;">Lesson Type:</span> <span class="text-info"><?=$lesson_type?></span>
                        </div>
                        <?php
                            if ($lesson_file['free'] == 'on') {
                                echo '<p class="text-muted mb-0" style="font-size: 12px;">Free</p>';
                            } else {
                                echo '<p class="text-muted mb-0" style="font-size: 12px;">Premium</p>';
                            }
                        ?>
                    </h5>
                    
                    <!-- Action buttons -->
                    <div class="mb-3">
                        <a href="javascript::" class="btn btn-outline-info btn-sm ml-1 me-1" onclick="show_ajax_modal('<?= base_url('admin/lesson_files/ajax_add_material/' . $lesson_id.'/'.$lesson_file['id'].'/other-pdf') ?>', 'Add Materials')">
                            <i class="mdi mdi-plus"></i> Add Materials
                        </a>
                        <a href="javascript::" class="btn btn-outline-info btn-sm ml-1 me-1 d-none" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_quiz/' . $lesson_id.'/'.$lesson_file['id']) ?>', 'Add Quiz')">
                            <i class="mdi mdi-plus"></i> Add Quiz
                        </a>
                        <a href="javascript::" class="btn btn-outline-info btn-sm ml-1 me-1" onclick="show_ajax_modal('<?= base_url('admin/lesson_files/ajax_add_article/' . $lesson_id.'/'.$lesson_file['id']) ?>', 'Add Article')">
                            <i class="mdi mdi-plus"></i> Add Article
                        </a>
                    </div>

                    <!-- Video play link -->
                    <?php if ($lesson_type == 'Video') { ?>
                        <a href="<?=$lesson_file['video_url']?>" class="btn btn-outline-primary btn-sm ml-1 float-left" target="_blank">
                            <i class="mdi mdi-eye"></i> Play Video
                        </a>
                    <?php } ?>

                    <div class="float-end">
                        <button onclick="show_small_modal('<?=base_url('admin/lesson_files/ajax_edit/'.$lesson_file['id'])?>', 'Update Lesson file')"
                                class="btn btn-primary btn-sm">
                            <i class="mdi mdi-pencil-outline"></i> Edit
                        </button>
                        <button  onclick="delete_modal('<?php echo site_url('admin/lesson_files/delete/'.$lesson_file['id']); ?>');" 
                                 class="btn btn-outline-danger btn-sm" style="margin-left: 10px;">
                            <i class="mdi mdi-window-close"></i> Delete
                        </button>
                    </div>
                </div>
            </div> <!-- end card -->

            <!-- Now loop through and display related PDFs and Quizzes under the video -->
            <?php
                // Check if there are any related files for this video (PDFs and quizzes)
                if (isset($grouped_files[$lesson_file['id']])) {
                    foreach ($grouped_files[$lesson_file['id']] as $related_file) {
                        if ($related_file['attachment_type'] == 'pdf') {
                            $pdf_count++;
                            $lesson_type = 'PDF';
                            $lesson_icon = 'mdi mdi-file-pdf-box';
                        } else if ($related_file['attachment_type'] == 'quiz') {
                            $quiz_count++;
                            $lesson_type = 'Quiz';
                            $lesson_icon = 'mdi mdi-comment-question-outline';
                        }
                        else if ($related_file['attachment_type'] == 'article') {
                            $quiz_count++;
                            $lesson_type = 'Article';
                            $lesson_icon = 'mdi mdi-note-multiple-outline';
                        }
                        ?>
                        <div class="card text-secondary on-hover-action mb-2 ms-4" style="background-color: <?=$backgroundColor?> !important;">
                            <div class="card-body thinner-card-body">
                                <h5 class="card-title mb-0">
                                    <span class="font-weight-light" style="font-size: 15px;"><i class="<?=$lesson_icon?>"></i> <?=$lesson_type?> <?=$item_no?></span>: <span style="font-size: 18px;"><?=$related_file['title']?></span><br><br>

                                    <div class="mb-1">
                                        <span class="font-weight-light" style="font-size: 13px;">Lesson Type:</span> <span class="text-info"><?=$lesson_type?></span>
                                    </div>
                                    <hr>

                                    <?php
                                    if ($lesson_type == 'PDF') {
                                        ?>
                                        <a href="<?=base_url(get_file($related_file['attachment']))?>" class="btn btn-outline-primary btn-sm ml-1 float-left" target="_blank"><i class="mdi mdi-eye"></i> View File</a>
                                        <?php
                                    } else if ($lesson_type == 'Quiz') {
                                        ?>
                                        <a href="<?=base_url('admin/exam/exam_questions/'.$related_file['id'])?>" class="btn btn-outline-primary btn-sm ml-1 float-left" target="_blank"><i class="mdi mdi-eye"></i> Questions</a>
                                        <?php
                                    }
                                    ?>
                                    
                                    <div class="float-end">
                                        <button onclick="show_ajax_modal('<?=base_url('admin/lesson_files/ajax_edit/'.$related_file['id'])?>', 'Update Lesson file')"
                                                class="btn btn-primary btn-sm">
                                            <i class="mdi mdi-pencil-outline"></i> Edit
                                        </button>
                                        <button  onclick="delete_modal('<?php echo site_url('admin/lesson_files/delete/'.$related_file['id']); ?>');" 
                                                 class="btn btn-outline-danger btn-sm" style="margin-left: 10px;">
                                            <i class="mdi mdi-window-close"></i> Delete
                                        </button>
                                    </div>
                                </h5>
                            </div>
                        </div> <!-- end card -->
                        <?php
                    }
                }
            ?>
        <?php } ?>
    </div>
</div>
            </div> <!-- end card-body-->
        </div>
    </div><!-- end col-->
</div>






