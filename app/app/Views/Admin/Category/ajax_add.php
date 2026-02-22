<!-- Include FontAwesome CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<!-- Include FontAwesome Icon Picker CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/fontawesome-iconpicker/3.2.0/css/fontawesome-iconpicker.css" integrity="sha512-9yS+ck0i78HGDRkAdx+DR+7htzTZJliEsxQOoslJyrDoyHvtoHmEv/Tbq8bEdvws7s1AVeCjCMOIwgZTGPhySw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/fontawesome-iconpicker/3.2.0/js/fontawesome-iconpicker.min.js" integrity="sha512-7dlzSK4Ulfm85ypS8/ya0xLf3NpXiML3s6HTLu4qDq7WiJWtLLyrXb9putdP3/1umwTmzIvhuu9EW7gHYSVtCQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<form autocomplete="off" action="<?=base_url('admin/category/add')?>" method="post"  enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row gy-4">
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="code" class="form-label">Category Code<span class="required text-danger">*</span></label>
                                    <input type="text" class="form-control" id="code" name="code" value="<?php echo substr(md5(rand(0, 1000000)), 0, 10); ?>" readonly>
                                </div>
                            </div>
                            <!--end col-->
                            <!--<div class="col-lg-6 p-2">-->
                            <!--    <div>-->
                            <!--        <label for="year" class="form-label">Year<span class="required text-danger">*</span></label>-->
                            <!--        <input type="number" class="form-control" id="year" name="year" required>-->
                            <!--    </div>-->
                            <!--</div>-->
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="name" class="form-label">Category Title<span class="required text-danger">*</span></label>
                                    <input type="text" class="form-control" id="name" name="name" required>
                                </div>
                            </div>
                            
                            
                            <div class="col-lg-6 p-2 d-none">
                                <label for="name" class="form-label">Parent <span class=" text-danger">*</span></label>
                                <select class="form-control select2" name="parent">
                                    <option value="0">None</option>
                                    <?php foreach($categories as $val){ ?>
                                            <option value="<?=$val['id']?>"><?=$val['name']?></option>
                                    <?php } ?>
                    
                                </select>
                            </div>
                            
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="font_awesome_class">Icon Picker</label>
                                        <input type="text" name="icon" id="icon-picker-input" class="form-control" placeholder="Select Icon">

                                    <!--<input type="text" id ="font_awesome_class" name="font_awesome_class" class="form-control icon-picker" autocomplete="off">-->
                                </div>
                            </div>
                            
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="category_thumbnail" class="form-label">Category thumbnail</label>
                                    <input type="file" class="form-control" id="image" name="category_thumbnail" required>
                                    <span style="color:red;font-size:10px;">***The image size should be: 400 X 255</span>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="category_icon" class="form-label">Category icon</label>
                                    <input type="file" class="form-control" id="image" name="category_icon" required>
                                    <!--<span style="color:red;font-size:10px;">***The image size should be: 400 X 255</span>-->
                                </div>
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

<script>
    document.getElementById('year').addEventListener('input', function (e) {
        const value = e.target.value;
        // If the input value is more than 4 digits, clear the input
        if (value.length > 4) {
            e.target.value = '';
            e.target.setCustomValidity('Please enter a valid year');
        } else {
            e.target.setCustomValidity('');
        }
    });
</script>
<!-- Include FontAwesome Icon Picker JS -->
<script>
$(document).ready(function() {
    // Initialize icon picker
    $('#icon-picker-input').iconpicker({
        iconset: 'fontawesome5', // Set the icon set to FontAwesome 5
        cols: 8, // Number of columns
        rows: 4, // Number of rows
        placement: 'bottom', // Placement of the icon picker relative to the input field
        align: 'left', // Alignment of the icon picker relative to the input field
    });
    
    //  $('#image').change(function() {
    //     var file = this.files[0];
    //     if (file) {
    //         var reader = new FileReader();
    //         reader.onload = function(e) {
    //             var img = new Image();
    //             img.onload = function() {
    //                 var width = this.width;
    //                 var height = this.height;
    //                 if (width !== 400 || height !== 255) {
    //                     alert('Error: Image dimensions must be 400x255.');
    //                     // Reset the file input
    //                     $('#image').val('');
    //                 }
    //             };
    //             img.src = e.target.result;
    //         };
    //         reader.readAsDataURL(file);
    //     }
    // });
});




</script>
