
<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/banners/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
                <div class="row">
                        <div class="col-lg-12">
                            <div class="card">
                                <div class="card-body">
                                    <div class="live-preview">
                                        <div class="row gy-4">
                                             <div class="col-lg-12 p-2">
                                                    <div>
                                                        <label for="title" class="form-label"> Title<span class="required text-danger">*</span></label>
                                                        <input type="text" class="form-control" id="title" name="title" required value="<?=$edit_data['title']?>">
                                                    </div>
                                                </div>
                                                
                                              
                                                <div class="col-lg-12 p-2">
                                                    <div>
                                                        <label for="image" class="form-label">Image</label>
                                                        <span class="text-muted"><br>Image Aspect ratio should be 1200x628 - Max File size 100KB </span>
                                                        <input type="file" class="form-control" id="image" name="image" >
                                                    </div>
                                                </div>
                                                
                                                <div class="col-12 form-group p-2">
                                                    <label for="title" class="form-label">Is Course related banner?</label>
                                                    <input type="checkbox" name="is_course_banner" id="is_course_banner" <?=$edit_data['is_course_banner'] ? 'checked' : '' ?>>
                                                </div>
                                                <div class="col-12 form-group p-2" id="course-select-wrapper" style="display: <?=$edit_data['is_course_banner'] ? 'block' : 'none' ?>;">
                                                    <label for="Course" class="form-label">Select course</label>
                                                    <select class="form-control select2" name="course_id" id="course_id">
                                                        <option value="">None</option>
                                                        <?php if(!empty($courses)){?>
                                                            <?php foreach($courses as $course){?>
                                                                <option value="<?= $course['id'] ?>" <?=$edit_data['course_id'] == $course['id'] ? 'selected' : '' ?>><?= $course['title'] ?></option>
                                                            <?php }?>
                                                        <?php }?>
                                                    </select>
                                                </div>
                                                
                                                <div class="col-12 form-group d-none">
                                                    <label for="title" class="form-label">Type</label>
                                                    <select class="form-control select2" name="type" id="type">
                                                        <option value="">None</option>
                                                        <option value="video" <?=$edit_data['type'] == 'video' ? 'selected' : '' ?>>Video</option>
                                                        <option value="link" <?=$edit_data['type'] == 'link' ? 'selected' : '' ?>>Link</option> 
                                                    </select>
                                                </div>
                                                <div class="col-12 form-group d-none">
                                                    <label for="url" class="form-label">Url</label>
                                                    <input type="text" class="form-control" id="url" name="url" value="<?=$edit_data['url']?>">
                                                </div>
                                                
                                                <div class="col-12 p-2">
                                                    <button class="btn btn-success float-end btn-save" type="submit">
                                                        <i class="ri-check-fill"></i> Save
                                                    </button>
                                                </div>
                                            
                                        </div>
                                        <!--end row-->
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!--end col-->
                    </div>
        </form>
        <?php
    }
?>
<script>
$(document).ready(function() {
    // Handle course banner checkbox change
    $('#is_course_banner').change(function() {
        if ($(this).is(':checked')) {
            $('#course-select-wrapper').show();
        } else {
            $('#course-select-wrapper').hide();
            $('#course_id').val(''); // Reset course selection when hidden
        }
    });
});

// $(document).ready(function() {
//     $('#image').change(function() {
//         var file = this.files[0];
//         if (file) {
//             var reader = new FileReader();
//             reader.onload = function(e) {
//                 var img = new Image();
//                 img.onload = function() {
//                     var width = this.width;
//                     var height = this.height;
//                     if (width !== 400 || height !== 255) {
//                         $('#image-error').text('Image dimensions must be 400x255.');
//                         $('#image').val(''); // Reset the file input
//                     } else {
//                         $('#image-error').empty(); // Clear any previous error messages
//                     }
//                 };
//                 img.src = e.target.result;
//             };
//             reader.readAsDataURL(file);
//         }
//     });
// });
</script>

