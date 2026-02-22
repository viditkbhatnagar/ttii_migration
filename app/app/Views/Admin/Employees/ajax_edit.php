<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('app/employees/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
            <div class="row">
                <div class="col-lg-12">
        
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
                                <div class="avatar-title bg-light rounded-circle">
                                    <?php if(valid_file($edit_data['profile_picture'])){ ?>
                                            <img src="<?=base_url(get_file($edit_data['profile_picture']))?>" id="user-profile-img" class="avatar-md rounded-circle h-auto" />
                                    <?php }else{ ?>
                                            <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" id="user-profile-img" class="avatar-md rounded-circle h-auto" />
                                    <?php } ?>
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="name" class="form-label">Employee Name</label>
                        <input type="text" class="form-control" id="name" name="name"
                               placeholder="Enter Employee Name" value="<?=$edit_data['name']?>" required>
                        <div class="invalid-feedback">Please Enter Employee Name.</div>
                    </div>
                    
                    <div class="row">
                        <div class="col-lg-6">
                            <div class="mb-3">
                                <label for="dob" class="form-label">Date of Birth<span class="required text-danger">*</span></label>
                                <input type="date" class="form-control" id="dob" name="dob" value="<?=$edit_data['dob']?>"
                                    required>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="mb-3">
                                <label for="jod" class="form-label">Joining Date<span class="required text-danger">*</span></label>
                                <input type="date" class="form-control" id="jod" name="jod" value="<?=$edit_data['jod']?>"
                                    required>
                            </div>
                        </div>
                    </div>
                    
                    
                    <div class="row">
                        <div class="col-lg-4">
                            <div class="mb-3">
                                <label for="role_id" class="form-label">Choose Role<span class="required text-danger">*</span></label>
                                <select class="form-control" id="role_id" name="role_id" required>
                                    <option value="">Select Role</option>
                                    <?php foreach($roles as $role){ ?>
                                        <option value="<?=$role['id']?>" <?= ($edit_data['role_id'] == $role['id']) ? 'selected' : '' ?>><?=$role['title']?></option>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3">
                                <label for="designation" class="form-label">Designation<span class="required required-designation text-danger">*</span></label>
                                <select class="form-control" id="user_designation_id" name="user_designation_id" required>
                                    <option value="">Select Designation</option>
                                    <?php foreach($designations as $designation){ ?>
                                        <option value="<?=$designation['id']?>" <?= ($edit_data['user_designation_id'] == $designation['id']) ? 'selected' : '' ?>><?=$designation['title']?></option>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="mb-3">
                                <label for="designation" class="form-label">Choose Team<span class="required text-danger">*</span></label>
                                <select class="form-control" id="team_id" name="team_id" required>
                                    <option value="0">No Team</option>
                                    <?php foreach($teams as $team){ ?>
                                        <option value="<?=$team['id']?>" <?= ($edit_data['team_id'] == $team['id']) ? 'selected' : '' ?>><?=$team['title']?></option>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                     <div class="row">
                        <div class="col-lg-6">
                            <div class="mb-3">
                                <label for="employee_code" class="form-label">Employee Code<span class="required required-employee-code text-danger">*</span></label>
                                <input type="text" class="form-control" id="employee_code" name="employee_code"
                                       placeholder="Enter Employee Code" value="<?=$edit_data['employee_code']?>" required>
                                <div class="invalid-feedback">Please Enter Employee Code.</div>
                            </div>
                        </div>
                         <div class="col-lg-6">
                           <div class="mb-3">
                                <label for="working_from" class="form-label">Work From<span class="required required-working_from text-danger">*</span></label>
                                <select class="form-control" id="working_from" name="working_from">
                                    <option value="office" <?php if($edit_data['working_from'] == "office") echo  "selected";?>>Office</option>
                                    <option value="remote" <?php if($edit_data['working_from'] == "remote") echo  "selected";?>>Remote</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    
                   
        
                    <div class="mb-4">
                        <label for="designation" class="form-label">Phone</label>
                        <input type="text" class="form-control" id="phone" name="phone" value="<?=$edit_data['phone']?>"
                               placeholder="Enter Phone Number" required>
                        <div class="invalid-feedback">Please Enter a phone number.</div>
                    </div>
        
                    <div class="mb-4">
                        <label for="designation" class="form-label">Email</label>
                        <input type="email" class="form-control" id="email" name="email" value="<?=$edit_data['email']?>"
                               placeholder="Enter Email" required>
                    </div>
        
                    <div class="hstack gap-2 justify-content-end">
                        <button class="btn btn-outline-primary float-end" type="submit"><i class="ri-check-fill"></i>Save</button>
                    </div>
                </div>
            </div>
        </form>
        <?php
    }
?>

<!--profile image-->
<script>
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
    });
    $(document).ready(function () {
        // Initial state
        toggleRequiredFields();

        // Event listener for role selection change
        $('#role_id').change(function () {
            toggleRequiredFields();
        });

        // Function to toggle required attribute and hide/show the required span
        function toggleRequiredFields() {
            var roleId = $('#role_id').val();

            // Check if the selected role is 1
            if (roleId == 1) {
                // If role is 1, remove required attribute for designation and employee code
                $('#user_designation_id').prop('required', false);
                $('#employee_code').prop('required', false);
                // Hide the required span for designation and employee code
                $('.required-designation').addClass('d-none');
                $('.required-employee-code').addClass('d-none');
            } else {
                // If role is not 1, add required attribute for designation and employee code
                $('#user_designation_id').prop('required', true);
                $('#employee_code').prop('required', true);
                // Show the required span for designation and employee code
                $('.required-designation').removeClass('d-none');
                $('.required-employee-code').removeClass('d-none');
            }
        }
    });
</script>