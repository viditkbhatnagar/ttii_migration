<?php
if (isset($edit_data)){
?>
<form action="<?= base_url('admin/counsellor/edit/'.$edit_data['id']) ?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <!-- Profile Picture Section -->
        <div class="text-center mb-4 mt-n5 pt-2">
            <div class="position-relative d-inline-block" style="margin-top: 30px; margin-bottom: 10px;">
                <div class="position-absolute bottom-0 end-0">
                    <label for="member-image-input" class="mb-0" data-bs-toggle="tooltip" data-bs-placement="right" title="Select Profile Picture">
                        <div class="avatar-xs">
                            <div class="avatar-title bg-light border rounded-circle text-muted cursor-pointer">
                                <i class="ri-image-fill"></i>
                            </div>
                        </div>
                    </label>
                    <input class="form-control d-none" id="member-image-input" type="file" accept="image/png, image/gif, image/jpeg" name="profile_picture">
                </div>
                <div class="avatar-lg">
                    <div class="avatar-title bg-light rounded-circle">
                        <?php if(valid_file($edit_data['profile_picture'])) { ?>
                            <img src="<?= base_url(get_file($edit_data['profile_picture'])) ?>" class="avatar-md rounded-circle h-auto" />
                        <?php } else { ?>
                            <img src="<?= base_url() ?>assets/app/images/place-holder/profile-place-holder.jpg" id="user-profile-img" class="avatar-md rounded-circle h-auto" />
                        <?php } ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Name -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="name" class="form-label">Name<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="name" id="name" value="<?= $edit_data['name'] ?>" required>
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
                                    <option value="<?= $code ?>" <?= $edit_data['country_code'] == $code ? 'selected' : '' ?>><?= $code ?> - <?= $country ?></option>
                                <?php } ?>
                            </select>
                        </div>
                        <div class="col-sm-9">
                            <input type="text" name="phone" id="phone" class="form-control" oninput="number_length(15, 'phone')" placeholder="Enter phone no" required value="<?= $edit_data['phone'] ?>"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Email -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="email" class="form-label">Email<span class="required text-danger">*</span></label>
            <input type="email" class="form-control" name="email" id="email" value="<?= $edit_data['user_email'] ?>" required>
        </div>

        <!-- Gender -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="gender" class="form-label">Gender<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="gender" required>
                <option value="Male" <?= $edit_data['gender'] == 'Male' ? 'selected' : '' ?>>Male</option>
                <option value="Female" <?= $edit_data['gender'] == 'Female' ? 'selected' : '' ?>>Female</option>
                <option value="Other" <?= $edit_data['gender'] == 'Other' ? 'selected' : '' ?>>Other</option>
            </select>
        </div>

        <!-- Date of Birth -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="dob" class="form-label">Date of Birth</label>
            <input type="date" class="form-control" name="dob" id="dob" value="<?= $edit_data['dob'] ?>">
        </div>

        <!-- Country -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="country_id" class="form-label">Country<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="country_id" required>
                <option value="" disabled>Select a Country</option>
                <?php foreach ($countries as $country) { ?>
                    <option value="<?= $country['country_id'] ?>" <?= $edit_data['country_id'] == $country['country_id'] ? 'selected' : '' ?>><?= $country['country'] ?></option>
                <?php } ?>
            </select>
        </div>

        <!-- Languages Spoken -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="languages_spoken" class="form-label">Languages Spoken</label>
            <input type="text" class="form-control" name="languages_spoken" id="languages_spoken" value="<?= $edit_data['languages_spoken'] ?>" placeholder="Enter languages (comma-separated)">
        </div>

        <!-- Highest Qualification -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="highest_qualification" class="form-label">Highest Qualification</label>
            <input type="text" class="form-control" name="highest_qualification" id="highest_qualification" value="<?= $edit_data['highest_qualification'] ?>" placeholder="Enter qualification">
        </div>

        <!-- Date of Joining -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="doj" class="form-label">Date of Joining</label>
            <input type="date" class="form-control" name="doj" id="doj" value="<?= $edit_data['date_of_joining'] ?>">
        </div>

        <!-- Status -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="status" class="form-label">Status<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="status" required>
                <option value="1" <?= $edit_data['drop_out_status'] == '1' ? 'selected' : '' ?>>Active</option>
                <option value="0" <?= $edit_data['drop_out_status'] == '0' ? 'selected' : '' ?>>Inactive</option>
            </select>
        </div>

        <!-- Save Button -->
        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit"><i class="ri-check-fill"></i>Save</button>
        </div>
    </div>
</form>

<script>
    $(document).ready(function () {
        // Profile image preview
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

        // Initialize Select2
        $('.select2').select2({
            dropdownParent: $("#ajax_modal") // Adjust if needed
        });
    });
</script>
<?php
}
?>
