<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/counsellor/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
             <div class="row">
                 
                 <!-- Profile Picture -->
            <div class="text-center mb-4 mt-n5 pt-2">
                <div class="position-relative d-inline-block" style="margin-top: 30px;margin-bottom: 10px;">
                    <div class="position-absolute bottom-0 end-0">
                        <label for="member-image-input" class="mb-0"
                            data-bs-toggle="tooltip" data-bs-placement="right"
                            title="Select Team Image">
                            <div class="avatar-xs">
                                <div class="avatar-title bg-light border rounded-circle text-muted cursor-pointer">
                                    <i class="ri-image-fill"></i>
                                </div>
                            </div>
                        </label>
                        <input class="form-control d-none" value=""
                            id="member-image-input" type="file"
                            accept="image/png, image/gif, image/jpeg" name="profile_picture">
                    </div>
                    <div class="avatar-lg">
                        <input type="hidden" name="cropped_image" id="cropped_image" />
                        <div class="avatar-title bg-light rounded-circle">
                            <?php if($edit_data['profile_picture'] != null){ ?>
                                <img src="<?=base_url($edit_data['profile_picture'])?>"
                                id="user-profile-img"
                                class="avatar-md rounded-circle h-auto" />
                            <?php }
                            else{ ?>
                                <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg"
                                id="user-profile-img"
                                class="avatar-md rounded-circle h-auto" />
                           <?php }?>
                        </div>
                    </div>
                </div>
            </div>
        
            <!-- Modal for Image Cropping with Larger Size -->
            <div class="modal fade" id="image-crop-modal" tabindex="-1" aria-labelledby="image-crop-modalLabel" aria-hidden="true" style="z-index: 9999;">
                <div class="modal-dialog modal-lg" style="max-width: 80%; /* Adjust the width as needed */">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="image-crop-modalLabel">Crop Image</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="img-container" style="width: 100%; height: 500px; /* Set height for the cropper */">
                                <img id="image-cropper" src="" alt="Selected Image" style="width: 100%;" />
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" id="crop-image-btn" class="btn btn-primary">Crop</button>
                        </div>
                    </div>
                </div>
            </div>

            
                <div class="col-lg-6 p-2">
                    <div>
                        <label for="code" class="form-label">Name<span class="required text-danger">*</span></label>
                        <input type="text" class="form-control textOnly" id="name" name="name"  value="<?=$edit_data['name'] ?>" required>
                    </div>
                </div>


                <!-- Gender -->
                <!-- <div class="col-12 col-md-6 form-group p-2 d-none">
                    <label for="gender" class="form-label">Gender<span class="required text-danger">*</span></label>
                    <select class="form-control" name="gender" id="gender" required>
                        <option value="" disabled>Select Gender</option>
                        <option value="Male" </?php echo ($edit_data['gender'] == 'Male') ? 'selected' : ''; ?>>Male</option>
                        <option value="Female" </?php echo ($edit_data['gender'] == 'Female') ? 'selected' : ''; ?>>Female</option>
                        <option value="Other" </?php echo ($edit_data['gender'] == 'Other') ? 'selected' : ''; ?>>Other</option>
                    </select>
                </div> -->
                
               
                 <!-- Phone -->
                <div class="col-12 col-md-6">
                    <div class="form-group">
                        <label for="phone" class="form-label">Phone <span class="text-danger">*</span></label>
                        <div class="input-group">
                            <select class="form-control" name="code" style="max-width: 130px;" required>
                                <?php foreach ($country_code as $code => $country) {
                                    $selected = (isset($edit_data['country_code']) && $edit_data['country_code'] == $code) ? 'selected' : '';
                                    echo "<option value=\"$code\" $selected>$code - $country</option>";
                                } ?>
                            </select>
                            <input type="number" name="phone" id="phone" class="form-control" oninput="number_length(15, 'phone')" placeholder="Enter phone no" required value="<?= isset($edit_data['phone']) ? $edit_data['phone'] : '' ?>">
                        </div>
                    </div>
                </div>
        
                <!-- Second Phone -->
                <div class="col-12 col-md-6">
                    <div class="form-group">
                        <label for="second_phone" class="form-label">Whatsapp</label>
                        <div class="input-group">
                            <select class="form-control" name="whatsapp_code" style="max-width: 130px;" required>
                                <?php foreach ($country_code as $code => $country) {
                                    $selected = (isset($edit_data['whatsapp_code']) && $edit_data['whatsapp_code'] == $code) ? 'selected' : '';
                                    echo "<option value=\"$code\" $selected>$code - $country</option>";
                                } ?>
                            </select>
                            <input type="number" name="whatsapp_phone" id="whatsapp_phone" class="form-control" oninput="number_length(15, 'whatsapp_phone')" placeholder="Enter second phone no" value="<?= isset($edit_data['whatsapp_phone']) ? $edit_data['whatsapp_phone'] : '' ?>">
                        </div>
                    </div>
                </div>
                        
                 <div class="col-lg-6 p-2">
                    <div>
                        <label for="highest_qualification" class="form-label">Highest Qualification<span class="required text-danger">*</span></label>
                        <input type="text" class="form-control" id="qualification" name="qualification" required value="<?=$edit_data['qualification'] ?>">
                    </div>
                </div>
                

                <!-- Date of Joining -->
                <div class="col-12 col-md-6 form-group p-2">
                    <label for="doj" class="form-label">Date of Joining<span class="required text-danger">*</span></label>
                    <input type="date" class="form-control" name="doj" id="doj" required  value="<?=$edit_data['date_of_joining'] ?>">
                </div>


                <div class="col-lg-6 p-2">
                    <div>
                        <label for="email" class="form-label">Email<span class="required text-danger">*</span></label>
                        <input type="email" class="form-control" id="email" name="email" value="<?=$edit_data['user_email'] ?>" required>
                    </div>
                </div>

                <div class="col-lg-6 p-2">
                <div class="form-group">
                    <label for="password" class="form-label">
                    Password <span class="required text-danger">(keep blank if no change)</span>
                    </label>
                    <div class="input-group">
                    <input type="password" class="form-control" id="password" name="password">
                    <span class="input-group-text" style="cursor: pointer;" onclick="togglePasswordVisibility()">
                        <i class="ri-eye-close-line" id="togglePassword"></i>
                    </span>
                    </div>
                </div>
                </div>
                <script>
                    function togglePasswordVisibility() {
                        var passwordInput = document.getElementById("password");
                        var toggleIcon = document.getElementById("togglePassword");
                        passwordInput.type = passwordInput.type === "password" ? "text" : "password";
                        toggleIcon.classList.toggle("ri-eye-close-line");
                        toggleIcon.classList.toggle("ri-eye-line");
                    }
                </script>

                
                
                
                <div class="col-12 p-2">
                    <button class="btn btn-success float-end btn-save" type="submit">
                        <i class="ri-check-fill"></i> Save
                    </button>
                </div>
            </div>
            
            
            
        </form>
        <?php
    }
?>


<script>
    $('.numbersOnly').keypress(function(e) {
    var charCode = (e.which) ? e.which : event.keyCode;
    if (!String.fromCharCode(charCode).match(/[0-9]/)) {
        return false;
    }
});

$('.textOnly').keypress(function(e) {
    var charCode = (e.which) ? e.which : event.keyCode;
    if (!(/[a-zA-Z\s]/.test(String.fromCharCode(charCode)))) {
        return false;
    }
});
</script>
<!-- Add Cropper.js CSS -->
<link href="https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.css" rel="stylesheet" />
<!-- Add Cropper.js JS -->
<script src="https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.js"></script>


<script>
 $(document).ready(function () {
        // $('#member-image-input').change(function () {
        //     const file = this.files[0];
        //     if (file) {
        //         const reader = new FileReader();
        //         reader.onload = function (e) {
        //             $('#user-profile-img').attr('src', e.target.result);
        //         };
        //         reader.readAsDataURL(file);
        //     }
        // });

        let cropper;

        $('#member-image-input').change(function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    $('#image-cropper').attr('src', e.target.result);
                    $('#image-crop-modal').modal('show');

                    if (cropper) {
                        cropper.destroy();
                    }

                    const image = document.getElementById('image-cropper');
                    cropper = new Cropper(document.getElementById('image-cropper'), {
                        aspectRatio: 1, // 1:1 aspect ratio (circle)
                        viewMode: 1, // Restrict the cropper to within the container
                        preview: '.img-preview', // Optionally, set a preview element
                        minContainerWidth: 500, // Minimum width for the container (increase this value)
                        minContainerHeight: 500, // Minimum height for the container (increase this value)
                        ready: function() {
                            // You can add any additional customization here
                        }
                    });
                };
                reader.readAsDataURL(file);
            }
        });

        $('#crop-image-btn').click(function() {
            const canvas = cropper.getCroppedCanvas();
            const croppedImage = canvas.toDataURL('image/jpeg');

            $('#user-profile-img').attr('src', croppedImage);

            $('#image-crop-modal').modal('hide');

            $('input[name="cropped_image"]').val(croppedImage);

        });
        
        // Initialize the first editor
        ClassicEditor
        .create(document.querySelector('#editor'))
        .then(editor => {
            console.log(editor);
        })
        .catch(error => {
            console.error(error);
        });
    });
</script>
