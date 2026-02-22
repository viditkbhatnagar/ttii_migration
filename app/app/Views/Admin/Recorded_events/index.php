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
                    <span class="font-weight-light"> Recording -</span> <?=$event['title'] ?? ''?>
                    <div class="float-end">
                         <a href="javascript::" class="btn btn-outline-info btn-sm ml-1 float-left" onclick="show_small_modal('<?=base_url('admin/recorded_events/ajax_add/'.$event['id'])?>', 'Add Recorded Class')">
                                                        <i class="mdi mdi-plus"></i> Add Recording                                            
                                                    </a>
                        <a href="<?php echo site_url('admin/events/'); ?>" class="alignToTitle btn btn-outline-secondary btn-rounded btn-sm"> <i class=" mdi mdi-keyboard-backspace"></i> Back to Events</a>
                    </div>
                    </h5>
                <div class="clearfix"></div>
                
                
                <div class="col-md-12">
                    <!-- Portlet card -->

                    <?php

                        $video_count    = 0;
                        $item_no        = 0;
                        
                        $backgroundColors = array("beige", "aliceblue");

                        
                        foreach ($list_items as $key => $lesson_file){
                                
                                $backgroundColor = $backgroundColors[$key % count($backgroundColors)];

                            

                                $video_count++;
                                $item_no = $video_count;
                                $lesson_type = 'Video';
                                $lesson_icon = 'mdi mdi-video';
                           
                           
                            
                            ?>
                            <div class="card text-secondary on-hover-action mb-2" id="lesson-329" style="background-color: <?=$backgroundColor?> !important;">
                                <div class="card-body thinner-card-body">
                                    <h5 class="card-title mb-0">
                                        <span class="font-weight-light" style="font-size: 15px;"><i class="<?=$lesson_icon?>"></i> <?=$lesson_type?> <?=$item_no?></span>: <span style="font-size: 18px;"><?=$lesson_file['title']?></span><br><br>
                                        <hr>
                                        <a href="<?=$lesson_file['video_url']?>" class="btn btn-outline-primary btn-sm ml-1 float-left" target="_blank"><i class="mdi mdi-eye"></i> Play Video</a>
                                        
                                         <button  onclick="delete_modal('<?php echo site_url('admin/recorded_events/delete/'.$lesson_file['id']); ?>');" class="btn btn-outline-danger btn-sm float-right" style="margin-left: 10px;">
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






