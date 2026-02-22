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
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                </div>
            </div>
            
            <div class="card-body">
                    <div class="row">
                        <form method="get" action="" >
                            <div class="row g-3 ">
                                <!-- Course -->
                                <div class="col-xxl-4 col-lg-4 col-md-4 col-sm-4">
                                    <div class="input-light custom-rounded-2-em">
                                        <label for="course_id" class="form-label">Course</label>
                                        <select class="p-0 form-control select2 " name="course_id" id="course_id" onchange="get_lessons(this.value)">
                                            <option value="0" <?= !isset($_GET['course']) || $_GET['course'] == 0 ? 'selected' : '' ?>>Choose Course</option>
                                            <?php foreach ($course as $val) { ?>
                                            <option value="<?= $val['id'] ?>" <?= isset($_GET['course']) && $_GET['course'] == $val['id'] ? 'selected' : '' ?>><?= $val['title'] ?></option>
                                            <?php } ?>
                                        </select>
                                    </div>
                                </div>
                                <!--end col-->
                                
                                <!-- Course -->
                                <div class="col-xxl-4 col-lg-4 col-md-4 col-sm-4">
                                    <div class="input-light custom-rounded-2-em">
                                        <label for="course" class="form-label">Lesson</label>
                                        <select class="p-0 form-control select2 " name="lesson_id" id="lesson_id" required>
                                            <option value="">Choose Lesson</option>
                                        </select>
                                    </div>
                                </div>
                                <!--end col-->

                                <!-- Filters and Reset Buttons -->
                                <div class="col-xxl-2 col-lg-3 col-md-4 col-sm-6 d-flex justify-content-center align-items-end">
                                    <button type="submit" class="btn btn-secondary rounded-pill me-2">
                                        <i class="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                    </button>
                                </div>
                                <!--end col-->
                            </div>
                            <!--end row-->
                        </form>

                        <!-- end container -->

                    </div><!-- end row -->
                </div>
                
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">User Name</th>
                        <th style="width: 120px;">Lesson File</th>
                        <th style="width: 100px;">Report</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($users_reports)){
                            foreach ($users_reports as $key => $report){
                                
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$student[$report['user_id']]?></td>
                                    <td><?=$lesson_file[$report['lesson_file_id']]?></td>
                                    <td>
                                        <?php 
                                            if(valid_file($report['report_file'])) {
                                        ?>
                                            <a href="<?=base_url(get_file($report['report_file']))?>" class="btn btn-info rounded-pill me-2" target="_blank">
                                                <i class="ri-eye-fill align-bottom me-2"></i> View
                                            </a>
                                            <!--<a href="javascript::void()" class="btn btn-info rounded-pill me-2" onclick="show_large_modal('<?=base_url('admin/lesson_files/ajax_view_report/'.$report['id'])?>', 'View Report')">-->
                                            <!--    <i class="ri-eye-fill align-bottom me-2"></i> View-->
                                            <!--</a>-->
                                        <?php } ?>
                                    </td>
                                </tr>
                                <?php
                            }
                        }
                    ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div><!--end row-->


<script>
    function get_lessons(course_id){
        $.ajax({
            url: '<?php echo base_url("Admin/Question_bank/get_lessons"); ?>',
            type: 'POST',
            data: { course_id: course_id },
            success: function(data) {
                // Append HTML options to select element
                $('#lesson_id').html(data);
            }
        });    
    }
</script>


