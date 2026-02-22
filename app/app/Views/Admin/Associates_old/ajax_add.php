<form action="<?=base_url('admin/counsellor/add')?>" enctype="multipart/form-data" method="post" autocomplete="off">
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
                            <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg"
                                id="user-profile-img"
                                class="avatar-md rounded-circle h-auto" />
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
                <label for="name" class="form-label">Name<span class="required text-danger">*</span></label>
                <input type="text" class="form-control textOnly" id="name" name="name" required>
            </div>
        </div>
       

        <!-- Gender -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="gender" class="form-label">Gender<span class="required text-danger">*</span></label>
            <select class="form-control" name="gender" id="gender" required>
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
            </select>
        </div>



        <!-- Date of Birth -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="dob" class="form-label">Date of Birth<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" name="dob" id="dob" required>
        </div>

        <!-- Nationality -->
        <!-- <div class="col-12 col-md-6 form-group p-2">
            <label for="nationality" class="form-label">Nationality<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="nationality" required>
                <option value="">Select a Country</option>
                <?php foreach ($countries as $country) { ?>
                    <option value="<?= $country['country_id'] ?>"><?= $country['country'] ?></option>
                <?php } ?>
            </select>
        </div> -->


       
        <!-- Phone -->
        <div class="col-lg-6 p-2">
            <div class="form-group">
                <label for="phone" class="form-label">Phone <span class="text-danger">*</span></label>
                <div class="input-group">
                    <select class="form-control" name="code" style="max-width: 130px;" required>
                        <?php foreach ($country_code as $code => $country) {
                            echo "<option value=\"$code\" >$code - $country</option>";
                        } ?>
                    </select>
                <input type="number" name="phone" id="phone" class="form-control" oninput="number_length(15, 'phone')" placeholder="Enter phone no" required value="<?= isset($edit_data['phone']) ? $edit_data['phone'] : '' ?>">
                </div>
            </div>
        </div>
        
        <div class="col-lg-6 p-2">
            <div class="form-group">
                <label for="phone" class="form-label">Whatsapp <span class="text-danger">*</span></label>
                <div class="input-group">
                    <select class="form-control" name="whatsapp_code" style="max-width: 130px;" required>
                        <?php foreach ($country_code as $code => $country) {
                            echo "<option value=\"$code\" >$code - $country</option>";
                        } ?>
                    </select>
                <input type="number" name="whatsapp_phone" id="whatsapp_phone" class="form-control" oninput="number_length(15, 'phone')" placeholder="Enter phone no" required value="<?= isset($edit_data['phone']) ? $edit_data['phone'] : '' ?>">
                </div>
            </div>
        </div>
        
          
        <div class="col-lg-6 p-2">
            <div>
                <label for="highest_qualification" class="form-label">Highest Qualification<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="qualification" name="qualification" required>
            </div>
        </div>
        


        <!-- Date of Joining -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="doj" class="form-label">Date of Joining<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" name="doj" id="doj" required>
        </div>
        

        <div class="col-lg-6 p-2">
            <div>
                <label for="email" class="form-label">Email<span class="required text-danger">*</span></label>
                <input type="email" class="form-control" id="email" name="email" required autocomplete="new-password" >
            </div>
        </div>

        <div class="col-lg-6 p-2">
            <div>
                <label for="password" class="form-label">Password (Without Space)<span class="required text-danger">*</span></label>
                <div class="input-group">
                    <input type="password" class="form-control" id="password" name="fakepassword" required>
                    <input type="hidden" name="password" id="real-password">

                    <button type="button" class="btn btn-outline-secondary" id="togglePassword"><i class="ri-eye-off-fill"></i></button>
                    <button type="button" class="btn btn-outline-secondary" id="generatePassword">Generate</button>
                </div>
            </div>
        </div>
        
        <!-- Status -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="status" class="form-label">Status<span class="required text-danger">*</span></label>
            <select class="form-control" name="status" id="statuss" required>
                <option value="1" selected>Active</option>
                <option value="0">Inactive</option>
            </select>
        </div>
        
        
        
        
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>

<!-- Add Cropper.js CSS -->
<link href="https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.css" rel="stylesheet" />
<!-- Add Cropper.js JS -->
<script src="https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.js"></script>
<script>

    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("email").setAttribute("autocomplete", "off");
        document.getElementById("password").setAttribute("autocomplete", "new-password");
        document.getElementById("email").value = "";
        document.getElementById("password").value = "";
    });

    document.getElementById('togglePassword').addEventListener('click', function () {
        const passwordField = document.getElementById('password');
        const icon = this.querySelector('i');
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            icon.classList.remove('ri-eye-off-fill');
            icon.classList.add('ri-eye-fill');
        } else {
            passwordField.type = 'password';
            icon.classList.remove('ri-eye-fill');
            icon.classList.add('ri-eye-off-fill');
        }
    });
    
    document.getElementById('generatePassword').addEventListener('click', function () {
        const passwordField = document.getElementById('password');
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        passwordField.value = password;
    });
    
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
