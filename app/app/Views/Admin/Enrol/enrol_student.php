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
                <form action="<?=base_url('admin/enrol/enrol_student_save')?>" enctype="multipart/form-data" method="post">
                    <div>
                       <div class="row">
                           
                           
                            <div class="col-lg-8">
                               <div class="mb-3">
                                   <label class="form-label" for="course_id">Course<span class="required text-danger">*</span></label>
                                   <select class="form-select select2" data-toggle="select2" name="course_id" id="course_id" required>
                                       <option value="">Select</option>
                                       <?php foreach ($course as $vl): ?>
                                       <option value="<?=$vl['id']?>"><?=$vl['title']?></option>
                                       <?php endforeach; ?>
                                      </select>
                                </div>
                            </div>
                            
                             <div class="col-lg-8">
                               <div class="mb-3">
                                   <label class="form-label" for="user_id">Student<span class="required text-danger">*</span></label>
                                   <select class="form-select select2" data-toggle="select2" name="user_id" id="user_id" required>
                                    <option value="">Select</option>
                                       <?php foreach ($student as $vl): ?>
                                       <option value="<?=$vl['id']?>"><?=$vl['name']?></option>
                                       <?php endforeach; ?>
                                      </select>
                                     <div class="invalid-feedback">Please choose Student</div>
                                </div>
                            </div>
                            <div class="col-lg-8 d-none">
                               <div class="mb-3">
                                   <label class="form-label" for="package_id">Package</label>
                                   <select class="form-select select2" data-toggle="select2" name="package_id" id="package_id" >
                                       <option value="">Select</option>
                                        <?php foreach ($package as $vl): ?>
                                       <option value="<?=$vl['id']?>"><?=$vl['title']?></option>
                                       <?php endforeach; ?>
                                      </select>
                                       
                                      </select>
                                     <div class="invalid-feedback">Please choose Package</div>
                                </div>
                            </div>
                            
                       
                            
                             
                            
                            
                        </div>
                        
                        
                         <button type="submit" class="btn btn-success btn-label right ms-auto nexttab nexttab" data-nexttab="pills-experience-tab">
                                                    <i class="ri-arrow-right-line label-icon align-middle fs-16 ms-2"></i>Submit</button>
                        
                        
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
                url: base_url+'Question/get_subject_by_course', // Adjust the URL as per your routes
                data: {
                    course_id: course_id
                },
                dataType: 'json',
                success: function(response) {
                    // Clear existing options
                    $('#subject_id').empty();
                    // Add new options
                    $.each(response, function(index, subject) {
                        $('#subject_id').append('<option value="' + subject.id + '">' + subject.title + '</option>');
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
                    // Add new options
                    $.each(response, function(index, lesson) {
                        $('#lesson_id').append('<option value="' + lesson.id + '">' + lesson.title + '</option>');
                    });
                }
            });
        });
</script>





