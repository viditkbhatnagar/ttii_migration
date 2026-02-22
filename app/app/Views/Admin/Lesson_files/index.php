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
                        <a href="<?php echo base_url('admin/course/add_details/'.$course_id); ?>" class="alignToTitle btn btn-secondary btn-rounded btn-sm"> <i class=" mdi mdi-keyboard-backspace"></i> Back to Course</a>
                        <a onclick="show_ajax_modal('<?=base_url('admin/lesson_files/ajax_sort/'.$lesson_id)?>', 'Sort Files')" class="alignToTitle btn btn-info btn-rounded btn-sm"> <i class="mdi mdi-swap-horizontal"></i> Sort Files</a>
                       
                    </div>
                </h5>
                <div class="clearfix"></div>
                <?php
                    $task_type = ['1' => 'Reading', '2' => 'Writing', '3' => 'Listening', '4' => 'Speaking']
                ?>
                <div class="col-md-12">
                    <!-- Portlet card -->

                    <?php
                        $article_count      = 0;
                        $audio_count      = 0;
                        $pdf_count      = 0;
                        $video_count    = 0;
                        $quiz_count     = 0;
                        $item_no        = 0;
                        
                        $backgroundColors = array("beige", "aliceblue");

                        
                        foreach ($list_items as $key => $lesson_file){
                                
                                $backgroundColor = $backgroundColors[$key % count($backgroundColors)];

                            
                            if ($lesson_file['attachment_type'] == 'url'){
                                $video_count++;
                                $item_no = $video_count;
                                $lesson_type = 'VIDEO';
                                $lesson_icon = 'mdi mdi-video';
                            }else if ($lesson_file['attachment_type'] == 'pdf'){
                                $pdf_count++;
                                $item_no = $pdf_count;
                                $lesson_type = 'PDF';
                                $lesson_icon = 'mdi mdi-file-pdf-box';
                            }else if ($lesson_file['attachment_type'] == 'article'){
                                $article_count++;
                                $item_no = $article_count;
                                $lesson_type = 'ARTICLE';
                                $lesson_icon = 'mdi mdi-file-pdf-box';
                            }else if ($lesson_file['attachment_type'] == 'audio'){
                                $audio_count++;
                                $item_no = $audio_count;
                                $lesson_type = 'AUDIO';
                                $lesson_icon = 'mdi mdi-microphone';
                            }else if ($lesson_file['attachment_type'] == 'quiz'){
                                $quiz_count++;
                                $item_no = $quiz_count;
                                $lesson_type = 'QUIZ';
                                $lesson_icon = 'mdi mdi-comment-question-outline';
                            }
                            
                            ?>
                            <div class="card text-secondary on-hover-action mb-2" id="lesson-329" style="background-color: <?=$backgroundColor?> !important;">
                                <div class="card-body thinner-card-body">
                                    <h5 class="card-title mb-0">
                                        
                                        <span class="font-weight-light" style="font-size: 15px;"><i class="<?=$lesson_icon?>"></i> <?=$lesson_type?> <?=$item_no?></span>: <span style="font-size: 18px;"><?=$lesson_file['title']?></span><br><br>
                                        <div class="text-end">
                                            <?php if($lesson_file['is_practice'] == 1){ ?>
                                                <span class="badge badge-primary text-muted mb-0" style="font-size: 10px;">Practice</span>
                                            <?php } ?>
                                        </div>
                                        <div class="mb-1">
                                            <span class="font-weight-light" style="font-size: 13px;">Lesson Type:</span> <span class="text-info"><?=$lesson_type?></span>
                                        </div>
                                        
                                        <?php
                                            if ($lesson_file['free'] == 'on') {
                                                echo '<p class="text-muted mb-0" style="font-size: 10px;">Free</p>';
                                            }else{
                                                echo '<p class="text-muted mb-0" style="font-size: 10px;">Premium</p>';
                                            }
                                        ?>

                                        <hr>
                                        <?php
                                        // if(is_file($lesson_file['attachment'])){
                                            ?>
                                            <!--<a href="<?//=base_url($lesson_file['attachment'])?>" class="btn btn-outline-primary btn-sm ml-1 float-left" target="_blank"><i class="mdi mdi-eye"></i> View File</a>-->
                                            <?php
                                        // }
                                        ?>
                                        
                                        <?php
                                            if($lesson_type == 'PDF'){
                                        ?>
                                            <a href="<?=base_url(get_file($lesson_file['attachment']))?>" class="btn btn-outline-primary btn-sm ml-1 float-left" target="_blank"><i class="mdi mdi-eye"></i> View File</a>
                                        <?php
                                            }
                                            else if($lesson_type == 'ARTICLE')
                                            {
                                        ?>
                                            <a href="javascript::" class="btn btn-outline-primary btn-sm ml-1 float-left" onclick="show_ajax_modal('<?= base_url('admin/lesson_files/ajax_view/' . $lesson_file['id']) ?>', 'View Article')"><i class="mdi mdi-eye" ></i> View Article</a>
                                        <?php
                                            } else if($lesson_type == 'VIDEO'){
                                        ?>
                                            <a href="javascript::" class="btn btn-outline-primary btn-sm ml-1 float-left" onclick="show_ajax_modal('<?= base_url('admin/lesson_files/ajax_view_video/' . $lesson_file['id']) ?>', 'Play Video')"><i class="mdi mdi-eye" ></i> Play Video</a>
                                        <?php
                                            } else if($lesson_type == 'AUDIO'){
                                        ?>
                                            <a href="<?=base_url(get_file($lesson_file['audio_file']))?>" class="btn btn-outline-primary btn-sm ml-1 float-left" target="_blank"><i class="mdi mdi-eye"></i> Play Audio</a>

                                        <?php 
                                            } else if($lesson_type == 'QUIZ'){
                                        ?>
                                        
                                        <a href="<?=base_url('admin/exam/exam_questions/'.$lesson_file['id'])?>" class="btn btn-outline-primary btn-sm ml-1 float-left" target="_blank"><i class="mdi mdi-eye"></i> Questions</a>

                                        <?php 
                                        }
                                        ?>

                                       
                                        <button onclick="show_small_modal('<?=base_url('admin/lesson_files/ajax_edit/'.$lesson_file['id'])?>', 'Update Lesson file')"
                                                class="btn btn-primary btn-sm float-right" >
                                            <i class="mdi mdi-pencil-outline"></i> Edit
                                        </button>
                                         <button  onclick="delete_modal('<?php echo base_url('admin/lesson_files/delete/'.$lesson_file['id']); ?>');" class="btn btn-outline-danger btn-sm float-right" style="margin-left: 10px;">
                                            <i class="mdi mdi-window-close"></i> Delete
                                        </button>



                                    </h5>
                                </div>
                            </div> <!-- end card-->
                            <?php
                        }
                    ?>
                </div>
            </div> <!-- end card-body-->
        </div>
    </div><!-- end col-->
</div>






