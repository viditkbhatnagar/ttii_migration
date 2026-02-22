<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
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
                    
                    <div class="col-4">
                        <a class="btn btn-md btn-primary rounded-pill float-end" href="<?=base_url('uploads/bulk_question_upload.xlsx')?>">
                            <i class="mdi mdi-download"></i>
                           Download Template
                        </a>
                    </div>
                    
                </div>
            </div>
            
            <div class="card-body">
                <form action="<?=base_url('admin/question/question_excel_upload')?>" enctype="multipart/form-data" method="post">
                    <div>
                       <div class="row">
                            <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Course<span class="required text-danger">*</span></label>
                                   <select class="form-select select2" data-toggle="select2" name="course_id" id="course_id" required>
                                       <option value="">Select</option>
                                      <?php foreach ($course as $cou): ?>
                                       <option value="<?=$cou['id']?>"><?=$cou['title']?></option>
                                       <?php endforeach; ?>
                                    </select>
                                     <div class="invalid-feedback">Please choose Course</div>
                                </div>
                            </div>
                             
                            <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Lesson<span class="required text-danger">*</span></label>
                                   <select class="form-select select2"  name="lesson_id" id="lesson_id" required>
                                       <option value="">Select</option>
                                       
                                       
                                      </select>
                                     <div class="invalid-feedback">Please choose Lesson</div>
                                </div>
                            </div>
                            
                            <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Upload Excel<span class="required text-danger">*</span></label>
                                    <input type="file" class="form-control" id="excel_file" name="excel_file" required>

                                </div>
                            </div>
                            
                             
                            
                            
                        </div>
                        
                        
                         <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save rounded-pill" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
                        
                        
                    </div>
                </form>
            </div>
        </div>
    </div>
</div><!--end row-->

<script>

var base_url = '<?=base_url('admin/')?>';

    $('#category_id').change(function() {
        var category_id = $(this).val(); 
            $.ajax({
                type: 'POST',
                url: base_url+'Question/get_course_by_category', // Adjust the URL as per your routes
                data: {
                    category_id: category_id
                },
                dataType: 'json',
                success: function(response) {
                    // Clear existing options
                    $('#course_id').empty();
                    // Add new options
                    $('#course_id').append('<option value="">Select Course</option>');
                    $.each(response, function(index, course) {
                        $('#course_id').append('<option value="' + course.id + '">' + course.title + '</option>');
                    });
                }
            });
        });
        
        
        $('#course_id').change(function() {
        var course_id = $(this).val(); 
            $.ajax({
                type: 'POST',
                url: base_url+'Question/get_lesson_by_course', // Adjust the URL as per your routes
                data: {
                    course_id: course_id
                },
                dataType: 'json',
                success: function(response) {
                    // Clear existing options
                    $('#lesson_id').empty();
                    $('#lesson_id').append('<option value="">Select Lesson</option>');

                    $.each(response, function(index, lesson) {
                        $('#lesson_id').append('<option value="' + lesson.id + '">' + lesson.title + '</option>');
                    });
                }
            });
        });
        
        
        $('#subject_id').change(function() {
        var subject_id = $(this).val(); 
            $.ajax({
                type: 'POST',
                url: base_url+'Question/get_lesson_by_subject', // Adjust the URL as per your routes
                data: {
                    subject_id: subject_id
                },
                dataType: 'json',
                success: function(response) {
                    // Clear existing options
                    $('#lesson_id').empty();
                    $('#lesson_id').append('<option value="">Select Lesson</option>');
                    $.each(response, function(index, lesson) {
                        $('#lesson_id').append('<option value="' + lesson.id + '">' + lesson.title + '</option>');
                    });
                }
            });
        });
</script>





