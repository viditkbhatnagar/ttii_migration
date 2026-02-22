
<form autocomplete="off" action="<?=base_url('admin/banners/add')?>" method="post" novalidate enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="live-preview">
                <div class="row gy-4">
                    
                    <div class="col-lg-12">
                        <div>
                            <label for="title" class="form-label"> Title<span class="required text-danger">*</span></label>
                            <input type="text" class="form-control" id="title" name="title" required>
                        </div>
                    </div>
                    
                  
                    <div class="col-lg-12">
                        <div>
                            <label for="image" class="form-label">Image<span class="required text-danger">*</span></label>
                            <span class="text-muted">Image Aspect ratio should be 1200x628 - Max File size 100KB</span>
                            <input type="file" class="form-control" id="image" name="image" required>
                            <div id="image-error" class="text-danger"></div>
                        </div>
                    </div>
                    
                    <div class="col-12 form-group">
                        <label for="title" class="form-label">Is Course related banner?</label>
                        <input type="checkbox" name="is_course_banner" id="is_course_banner">
                        <!-- <select class="form-control select2" name="is_course_banner" id="is_course_banner">
                            <option value="">None</option>
                            <option value="video">Video</option>
                            <option value="link">Link</option> 
                        </select> -->
                    </div>
                    <div class="col-12 form-group" id="course-select-wrapper" style="display: none;">
                        <label for="Course" class="form-label">Select course</label>
                        <select class="form-control select2" name="course_id" id="course_id">
                            <option value="">None</option>
                            <?php if(!empty($courses)){?>
                                <?php foreach($courses as $course){?>
                                    <option value="<?= $course['id'] ?>"><?= $course['title'] ?></option>
                                <?php }?>
                            <?php }?>
                        </select>
                    </div>
                    <div class="col-12 form-group d-none">
                        <label for="url" class="form-label">Url</label>
                        <input type="text" class="form-control" id="url" name="url"  >
                    </div>
                    
                    <div class="col-12">
                        <button class="btn btn-success float-end btn-save" type="submit">
                            <i class="ri-check-fill"></i> Save
                        </button>
                    </div>
                    
                </div>
                <!--end row-->
            </div>
        </div>
        <!--end col-->
    </div>
</form>


<!-- Include FontAwesome Icon Picker JS -->
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
//     // Initialize icon picker
//     $('#icon-picker-input').iconpicker({
//         iconset: 'fontawesome5', // Set the icon set to FontAwesome 5
//         cols: 8, // Number of columns
//         rows: 4, // Number of rows
//         placement: 'bottom', // Placement of the icon picker relative to the input field
//         align: 'left', // Alignment of the icon picker relative to the input field
//     });
    
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
