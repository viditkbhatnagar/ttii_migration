<form action="<?=base_url('admin/associates/add')?>" method="post" enctype="multipart/form-data" id="myForm">
    <div class="row">
        <!-- Profile Picture -->
        <div class="text-center mb-4 mt-n5 pt-2">
            <div class="position-relative d-inline-block" style="margin-top: 30px;margin-bottom: 10px;">
                <div class="position-absolute bottom-0 end-0">
                    <label for="member-image-input" class="mb-0" data-bs-toggle="tooltip" data-bs-placement="right" title="Select Team Image">
                        <div class="avatar-xs">
                            <div class="avatar-title bg-light border rounded-circle text-muted cursor-pointer">
                                <i class="ri-image-fill"></i>
                            </div>
                        </div>
                    </label>
                    <input class="form-control d-none" value="" id="member-image-input" type="file" accept="image/png, image/gif, image/jpeg" name="profile_picture">
                </div>
                <div class="avatar-lg">
                    <div class="avatar-title bg-light rounded-circle">
                        <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" id="user-profile-img" class="avatar-md rounded-circle h-auto" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Full Name -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="name" class="form-label">Full Name<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="name" id="name" placeholder="Full Name" required>
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
        <div class="col-12 col-md-6 form-group p-2">
            <label for="nationality" class="form-label">Nationality<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="nationality" required>
                <option value="">Select a Country</option>
                <?php foreach ($countries as $country) { ?>
                    <option value="<?= $country['country_id'] ?>"><?= $country['country'] ?></option>
                <?php } ?>
            </select>
        </div>
        
        <!--<div class="col-12 col-md-6 form-group p-2">-->
        <!--    <label for="university" class="form-label">Assign Universities<span class="required text-danger">*</span></label>-->
        <!--    <select class="form-control select2" name="university[]" multiple required>-->
        <!--        <option value="" disabled>Select Universities</option>-->
        <!--        </?php foreach ($universities as $university) { ?>-->
        <!--            <option value="</?= $university['id'] ?>"></?= $university['title'] ?></option>-->
        <!--        </?php } ?>-->
        <!--    </select>-->
        <!--</div>-->

        <!-- Languages Spoken -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="languages_spoken" class="form-label">Languages Spoken<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="languages_spoken" id="languages_spoken" placeholder="Languages Spoken" required>
        </div>

        <!-- Phone Number -->
        <div class="col-12 col-md-6 form-group p-2">
            <div>
                <label for="phone" class="form-label">Phone Number</label>
                <div class="col-sm-12">
                    <div class="input-group">
                        <div class="col-sm-3">
                            <select class="form-control" name="code" required>
                                <?php foreach ($country_code as $code => $country) { ?>
                                    <option value="<?= $code ?>"><?= $code ?> - <?= $country ?></option>
                                <?php } ?>
                            </select>
                        </div>
                        <div class="col-sm-9">
                            <input type="text" name="phone" id="phone" class="form-control" oninput="number_length(15, 'phone')" placeholder="Enter phone no" required />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        

        <!-- Highest Qualification -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="highest_qualification" class="form-label">Highest Qualification<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="highest_qualification" id="highest_qualification" placeholder="Highest Qualification" required>
        </div>

        <!-- Date of Joining -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="doj" class="form-label">Date of Joining<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" name="doj" id="doj" required>
        </div>
        
         <!-- <div class="col-12 col-md-6 form-group p-2">
            <label for="username" class="form-label">Username<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="username" id="username" placeholder="Username" required>
        </div> -->

        <!-- Email Address -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="email" class="form-label">Email Address<span class="required text-danger">*</span></label>
            <input type="email" class="form-control" name="email" id="email" placeholder="Email Address" required>
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="password" class="form-label">Password<span class="required text-danger">*</span></label>
            <input type="password" class="form-control" name="password" id="password" required>
        </div>

        <!-- Status -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="status" class="form-label">Status<span class="required text-danger">*</span></label>
            <select class="form-control" name="status" id="statuss" required>
                <option value="1" selected>Active</option>
                <option value="0">Inactive</option>
            </select>
        </div>

        <!-- Submit Button -->
        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit"><i class="ri-check-fill"></i> Save</button>
        </div>
    </div>
</form>

<script>
    // Profile image preview script
    $(document).ready(function () {
        $('#member-image-input').change(function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    $('#user-profile-img').attr('src', e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        // Initialize select2
        $('.select2').select2({
            dropdownParent: $("#ajax_modal")
        }); 
    });
</script>
