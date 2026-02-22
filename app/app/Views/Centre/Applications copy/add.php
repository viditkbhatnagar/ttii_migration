<!-- Navigation breadcrumb -->
<div class="card shadow ">
    <div class="d-flex justify-content-between align-items-center m-4">
        <h4 class="text-primary mb-0"><?= $page_title ?></h4>
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-0">
                <li class="breadcrumb-item"><a href="<?= base_url('admin/applications/index') ?>" class="text-muted">Applicants</a></li>
                <li class="breadcrumb-item active text-primary" aria-current="page"><?= $page_title ?></li>
            </ol>
        </nav>
    </div>
</div>

<!-- Main form card -->
<div class="card shadow-sm">
    <div class="card-body">

        <!-- Tabs Navigation -->
        
        <!-- Tabs Navigation -->
        <ul class="nav nav-tabs mb-4" id="studentTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('admin/applications/edit/' . $edit_data['id'] . '?active=1') : base_url('admin/applications/add?active=1') ?>"
                    class="nav-link <?= ($activeTab == 1) ? 'active' : ''; ?>"
                    id="basic-tab"
                    aria-selected="<?= ($activeTab == 1) ? 'true' : 'false'; ?>">
                    <i class="ri-user-line me-1"></i>Basic Info
                </a>
            </li>
            <li class="nav-item" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('admin/applications/edit/' . $edit_data['id'] . '?active=2') : base_url('admin/applications/add?active=2') ?>"
                    class="nav-link <?= ($activeTab == 2) ? 'active' : ''; ?>"
                    id="course-tab"
                    aria-selected="<?= ($activeTab == 2) ? 'true' : 'false'; ?>">
                    <i class="ri-book-open-line me-1"></i>Qualification Details
                </a>
            </li>
            <li class="nav-item" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('admin/applications/edit/' . $edit_data['id'] . '?active=3') : base_url('admin/applications/add?active=3') ?>"
                    class="nav-link <?= ($activeTab == 3) ? 'active' : ''; ?>"
                    id="qualification-tab"
                    aria-selected="<?= ($activeTab == 3) ? 'true' : 'false'; ?>">
                    <i class="ri-graduation-cap-line me-1"></i>Enrolment Details
                </a>
            </li>
            
            
            <li class="nav-item d-none" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('admin/applications/edit/' . $edit_data['id'] . '?active=4') : base_url('admin/applications/add?active=4') ?>"
                    class="nav-link <?= ($activeTab == 4) ? 'active' : ''; ?>"
                    id="course-fee-tab"
                    aria-selected="<?= ($activeTab == 4) ? 'true' : 'false'; ?>">
                    <i class="ri-money-dollar-circle-line me-1"></i>Fee Information
                </a>
            </li>
            <li class="nav-item d-none" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('admin/applications/edit/' . $edit_data['id'] . '?active=5') : base_url('admin/applications/add?active=5') ?>"
                    class="nav-link <?= ($activeTab == 5) ? 'active' : ''; ?>"
                    id="documents-tab"
                    aria-selected="<?= ($activeTab == 5) ? 'true' : 'false'; ?>">
                    <i class="ri-folder-line me-1"></i>Documents
                </a>
            </li>
            
             <li class="nav-itemn" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('admin/applications/edit/' . $edit_data['id'] . '?active=6') : base_url('admin/applications/add?active=6') ?>"
                    class="nav-link <?= ($activeTab == 6) ? 'active' : ''; ?>"
                    id="lms-tab"
                    aria-selected="<?= ($activeTab == 6) ? 'true' : 'false'; ?>">
                    <i class="ri-folder-line me-1"></i>LMS/CRM Specific Information
                </a>
            </li>
        </ul>



        <!-- Tabs Content -->
        <div class="tab-content" id="studentTabsContent">
            <!-- Basic Info Tab -->
            <div class="tab-pane fade <?= ($activeTab == 1) ? 'show active' : ''; ?>" id="basic" role="tabpanel">
               <form action="<?= base_url('admin/applications/' . (isset($edit_data['id']) ? 'edit/' . $edit_data['id'] : 'add')) ?>" method="post" enctype="multipart/form-data" id="basicForm">
                    <div class="row g-3">
                        <!-- Personal Information Section -->
                        <div class="col-12">
                            <h3>Personal Information</h3>
                        </div>
                
                        <!-- Profile Picture -->
                         <div class="text-center mb-4 mt-n5 pt-2">
                                <div class="position-relative d-inline-block" style="margin-top: 30px;margin-bottom: 10px;">
                                    <div class="position-absolute bottom-0 end-0">
                                        <label for="member-image-input" class="mb-0" data-bs-toggle="tooltip" data-bs-placement="right"
                                            title="Select Team Image">
                                            <div class="avatar-xs">
                                                <div class="avatar-title bg-light border rounded-circle text-muted cursor-pointer">
                                                    <i class="ri-image-fill"></i>
                                                </div>
                                            </div>
                                        </label>
                                        <input class="form-control d-none" id="member-image-input" type="file"
                                            accept="image/png, image/gif, image/jpeg" name="profile_picture">
                                    </div>
                                    <div class="avatar-lg">
                                        <input type="hidden" name="cropped_image" id="cropped_image" />
                                        <div class="avatar-title bg-light rounded-circle">
                                            <?php 
                                            if (isset($edit_data['image']) && !empty($edit_data['image'])) { ?>
                                                <img src="<?= base_url(get_file($edit_data['image'])) ?>" 
                                                     id="user-profile-img" 
                                                     class="avatar-md rounded-circle h-auto" />
                                            <?php } else { ?>
                                                <img src="<?= base_url('assets/admin/images/place-holder/profile-place-holder.jpg') ?>" 
                                                     id="user-profile-img" 
                                                     class="avatar-md rounded-circle h-auto" />
                                            <?php } ?>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <!-- Modal for Image Cropping with Larger Size -->
                            <div class="modal fade" id="image-crop-modal" tabindex="-1" aria-labelledby="image-crop-modalLabel" aria-hidden="true">
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
                
                        
                        <!-- Application ID -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="application_id" class="form-label">Application ID <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="application_id" name="application_id" readonly placeholder="" required value="<?= isset($edit_data['application_id']) ? $edit_data['application_id'] : $application_id ?>">
                            </div>
                        </div>

                        <!-- Name -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="name" class="form-label">Full Name <span class="text-danger">*</span></label>
                                <input type="text" class="form-control textOnly" id="name" name="name" placeholder="Enter student name" required value="<?= isset($edit_data['name']) ? $edit_data['name'] : '' ?>">
                            </div>
                            <script>
                                    document.getElementById('name').addEventListener('blur', function () {
                                        this.value = this.value.replace(/\b\w/g, function(char) {
                                            return char.toUpperCase();
                                        });
                                    });
                            </script>
                        </div>
                
                        <!-- Date of Birth -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="DOB" class="form-label">Date of Birth <span class="text-danger">*</span></label>
                                <input type="date" class="form-control" id="DOB" name="DOB" required value="<?= isset($edit_data['date_of_birth']) ? $edit_data['date_of_birth'] : '' ?>">
                            </div>
                        </div>
                
                        <!-- Age -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="age" class="form-label">Age</label>
                                <input type="text" class="form-control numbersOnly" id="age" name="age" readonly value="<?= isset($edit_data['age']) ? $edit_data['age'] : '' ?>">
                            </div>
                        </div>
                
                        <!-- Gender -->
                        <div class="col-12 col-md-6">
                            <label for="gender" class="form-label">Gender <span class="text-danger">*</span></label>
                            <select class="form-control" id="gender" name="gender" required>
                                <option value="">Select Gender</option>
                                <option value="Male" <?= isset($edit_data['gender']) && $edit_data['gender'] == 'Male' ? 'selected' : '' ?>>Male</option>
                                <option value="Female" <?= isset($edit_data['gender']) && $edit_data['gender'] == 'Female' ? 'selected' : '' ?>>Female</option>
                                <option value="Other" <?= isset($edit_data['gender']) && $edit_data['gender'] == 'Other' ? 'selected' : '' ?>>Other</option>
                            </select>
                        </div>
                
                        <!-- Nationality -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="nationality" class="form-label">Nationality <span class="text-danger">*</span></label>
                                <select class="form-select select2" name="nationality" id="nationality" required>
                                    <option value="0">Choose country</option>
                                    <?php foreach ($countries as $country_id => $country) {
                                        $selected = (isset($edit_data['nationality']) && $edit_data['nationality'] == $country_id) ? 'selected' : '';
                                        echo "<option value=\"{$country_id}\" {$selected}>{$country['country']}</option>";
                                    } ?>
                                </select>
                            </div>
                        </div>
                
                        <!-- Marital Status -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="marital_status" class="form-label">Marital Status <span class="text-danger">*</span></label>
                                <select class="form-control" name="marital_status" id="marital_status" required>
                                    <option value="single" <?php if (isset($edit_data['marital_status']) && $edit_data['marital_status'] == 'single') echo 'selected'; ?>>Single</option>
                                    <option value="married" <?php if (isset($edit_data['marital_status']) && $edit_data['marital_status'] == 'married') echo 'selected'; ?>>Married</option>
                                    <option value="widowed" <?php if (isset($edit_data['marital_status']) && $edit_data['marital_status'] == 'widowed') echo 'selected'; ?>>Widowed</option>
                                    <option value="not_preferred" <?php if (isset($edit_data['marital_status']) && $edit_data['marital_status'] == 'not_preferred') echo 'selected'; ?>>Prefer Not to Say</option>
                                </select>
                            </div>
                        </div>

                        <!-- Family Details -->
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="father_name" class="form-label">Father's Name<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control textOnly" id="father_name" name="father_name" placeholder="Enter Father's Name" required value="<?= isset($edit_data['father_name']) ? $edit_data['father_name'] : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="mother_name" class="form-label">Mother's Name<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control textOnly" id="mother_name" name="mother_name" placeholder="Enter Mother's Name" required value="<?= isset($edit_data['mother_name']) ? $edit_data['mother_name'] : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="guardian_name" class="form-label">Guardian's Name (if applicable)</label>
                                    <input type="text" class="form-control textOnly" id="guardian_name" name="guardian_name" placeholder="Enter Guardian's Name" value="<?= isset($edit_data['guardian_name']) ? $edit_data['guardian_name'] : '' ?>">
                                </div>
                            </div>
                        

                
                        <!-- Aadhar Number -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="aadhar_no" class="form-label numbersOnly">Aadhar Number <span class="text-danger"></span></label>
                                <input type="text" class="form-control numberOnly" id="aadhar_no" name="aadhar_no" placeholder="0000 0000 0000 0000"  value="<?= isset($edit_data['aadhar_no']) ? $edit_data['aadhar_no'] : '' ?>">
                            </div>
                        </div>
                
                        <!-- Passport Number -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="passport_no" class="form-label">Passport Number</label>
                                <input type="text" class="form-control numberOnly" id="passport_no" name="passport_no" placeholder="X0000000"  value="<?= isset($edit_data['passport_no']) ? $edit_data['passport_no'] : '' ?>">
                            </div>
                        </div>
                        <p class="text-muted" >Either Aadhaar Number or Passport Number is required</p>

                        <hr>
                
                        <!-- Contact Information Section -->
                        <div class="col-12">
                            <h4>Contact Information</h4>
                        </div>
                
                        <!-- Phone -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="phone" class="form-label">Phone <span class="text-danger">*</span></label>
                                <div class="input-group">
                                    <select class="form-control" name="code" style="max-width: 130px;" required>
                                        <?php foreach ($country_code as $code => $country) {
                                            $selected = (isset($edit_data['code']) && $edit_data['code'] == $code) ? 'selected' : '';
                                            echo "<option value=\"$code\" $selected>$code - $country</option>";
                                        } ?>
                                    </select>
                                    <input type="number" name="phone" id="phone" class="form-control numbersOnly" oninput="number_length(15, 'phone')" placeholder="Enter phone no" required value="<?= isset($edit_data['phone']) ? $edit_data['phone'] : '' ?>">
                                </div>
                            </div>
                        </div>
                
                        <!-- Second Phone -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="second_phone" class="form-label">Second Phone</label>
                                <div class="input-group">
                                    <select class="form-control" name="second_code" style="max-width: 130px;" required>
                                        <?php foreach ($country_code as $code => $country) {
                                            $selected = (isset($edit_data['second_code']) && $edit_data['second_code'] == $code) ? 'selected' : '';
                                            echo "<option value=\"$code\" $selected>$code - $country</option>";
                                        } ?>
                                    </select>
                                    <input type="number" name="second_phone" id="second_phone" class="form-control numbersOnly" oninput="number_length(15, 'second_phone')" placeholder="Enter second phone no" value="<?= isset($edit_data['second_phone']) ? $edit_data['second_phone'] : '' ?>">
                                </div>
                            </div>
                        </div>
                
                        <!-- WhatsApp -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="whatsapp_no" class="form-label">WhatsApp No</label>
                                <div class="d-flex">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="copy_option" id="copy_from_phone" value="copy_from_phone">
                                        <label class="form-check-label" for="copy_from_phone" style="font-size: 10px;">Same as Phone</label>
                                    </div>
                                    <div class="form-check ms-1">
                                        <input class="form-check-input ms-1" type="radio" name="copy_option" id="copy_from_second_phone" value="copy_from_second_phone">
                                        <label class="form-check-label" for="copy_from_second_phone" style="font-size: 10px;">Same as Second Phone</label>
                                    </div>
                                </div>
                                <input type="tel" class="form-control numbersOnly" id="whatsapp_no" name="whatsapp_no" placeholder="Enter student WhatsApp No" value="<?= isset($edit_data['whatsapp_no']) ? $edit_data['whatsapp_no'] : '' ?>">
                            </div>
                        </div>
                
                        <!-- Email -->
                        <div class="col-12 col-md-6 pt-3">
                            <div class="form-group">
                                <label for="email" class="form-label">Email <span class="text-danger">*</span></label>
                                <input type="email" class="form-control" id="email" name="email" placeholder="Enter student email" required value="<?= isset($edit_data['user_email']) ? $edit_data['user_email'] : '' ?>">
                            </div>
                        </div>
                
                        <!-- Country, State, and District Selection -->
                        <div class="col-12 col-md-4">
                            <div class="form-group">
                                <label for="country_id" class="form-label">Country</label>
                                <select class="form-select select2" name="country_id" id="country_id" onchange="getStates(this.options[this.selectedIndex].text)">
                                    <option value="0">Choose country</option>
                                    <?php foreach ($country_code as $code => $country) {
                                        $selected = (isset($edit_data['country_id']) && $edit_data['country_id'] == $code) ? 'selected' : '';
                                        echo "<option value=\"$code\" $selected>$country</option>";
                                    } ?>
                                </select>
                            </div>
                        </div>
                
                        <div class="col-12 col-md-4">
                            <div class="form-group">
                                <label for="state" class="form-label">State</label>
                                <select id="states" name="state" class="form-select select2" onchange="getDistrictsByState(this.value)">
                                    <option value="0">Select State</option>
                                </select>
                            </div>
                        </div>
                
                        <div class="col-12 col-md-4">
                            <div class="form-group">
                                <label for="districts" class="form-label">District</label>
                                <select id="districts" name="district" class="form-select select2">
                                    <option value="0">Select District</option>
                                </select>
                                <input type="text" id="district-input" name="district" class="form-control d-none" placeholder="Enter district">
                            </div>
                        </div>
                
                        <!-- Address -->
                       <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="address" class="form-label">Permanent Address<span class="text-danger">*</span></label>
                                <textarea class="form-control" id="address" name="address" required rows="4"><?= isset($edit_data['address']) ? $edit_data['address'] : '' ?></textarea>
                            </div>
                        </div>
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="native_address" class="form-label">Correspondence Address<span class="text-danger">*</span></label>&nbsp;&nbsp;
                                <input type="checkbox" name="same_address" id="same_address" value="1" <?= isset($edit_data['same_address']) && $edit_data['same_address'] == 1 ? 'checked' : '' ?>>
                                <label for="same_address">Same as Permanent Address</label>
                                <textarea class="form-control" id="native_address" name="native_address" required rows="4"><?= isset($edit_data['native_address']) ? $edit_data['native_address'] : '' ?></textarea>
                            </div>
                        </div>
                        
                        
                        <!-- <hr>
                        <!-- Emergency Contact Section -->
                        <!-- <div class="col-12">
                            <h4>Emergency Contact</h4>
                        </div>
                        
                        <div class="row">
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="emergency_name" class="form-label">Emergency Contact Name<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control textOnly" id="emergency_name" name="emergency_name" placeholder="Enter Emergency Contact Name" required value="<?= isset($edit_data['emergency_name']) ? $edit_data['emergency_name'] : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="emergency_phone" class="form-label">Emergency Contact Phone<span class="text-danger">*</span></label>
                                    <input type="tel" class="form-control numbersOnly" id="emergency_phone" name="emergency_phone" placeholder="Enter Emergency Contact Phone" required value="<?= isset($edit_data['emergency_phone']) ? $edit_data['emergency_phone'] : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="emergency_relation" class="form-label textOnly">Relationship to Emergency Contact<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="emergency_relation" name="emergency_relation" placeholder="Enter Relationship" required value="<?= isset($edit_data['emergency_relation']) ? $edit_data['emergency_relation'] : '' ?>">
                                </div>
                            </div>
                        </div> -->
                        
                        <!-- <hr>
                        <!-- Special Requirements Section 
                        <div class="col-12">
                            <h4>Special Requirements</h4>
                        </div>
                        
                        <div class="row">
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="learning_disabilities" class="form-label">Learning Disabilities (if any)</label>
                                    <textarea class="form-control" id="learning_disabilities" name="learning_disabilities" placeholder="Enter Details of Learning Disabilities (if any)" rows="3"><?= isset($edit_data['learning_disabilities']) ? $edit_data['learning_disabilities'] : '' ?></textarea>
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="accessibility_needs" class="form-label">Accessibility Needs (if any)</label>
                                    <textarea class="form-control" id="accessibility_needs" name="accessibility_needs" placeholder="Enter Accessibility Needs (e.g., for physically challenged students)" rows="3"><?= isset($edit_data['accessibility_needs']) ? $edit_data['accessibility_needs'] : '' ?></textarea>
                                </div>
                            </div>
                        </div> --> 
                        
                        <!-- <hr>
                        <!-- Marketing & Communication Section -->
                        <!-- <div class="col-12">
                            <h4>Marketing & Communication</h4>
                        </div>
                        
                        <div class="row">
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="marketing_source" class="form-label">How Did They Hear About Us?</label>
                                    <select class="form-control" id="marketing_source" name="marketing_source">
                                        <option value="referral" <?php if (isset($edit_data['marketing_source']) && $edit_data['marketing_source'] == 'referral') echo 'selected'; ?>>Referral</option>
                                        <option value="online_ads" <?php if (isset($edit_data['marketing_source']) && $edit_data['marketing_source'] == 'online_ads') echo 'selected'; ?>>Online Ads</option>
                                        <option value="social_media" <?php if (isset($edit_data['marketing_source']) && $edit_data['marketing_source'] == 'social_media') echo 'selected'; ?>>Social Media</option>
                                        <option value="website" <?php if (isset($edit_data['marketing_source']) && $edit_data['marketing_source'] == 'website') echo 'selected'; ?>>Website</option>
                                        <option value="other" <?php if (isset($edit_data['marketing_source']) && $edit_data['marketing_source'] == 'other') echo 'selected'; ?>>Other</option>
                                    </select>
                                </div>
                            </div> -->

                            
                            <!-- Pipeline -->
                            <!-- <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="pipeline" class="form-label">Pipeline</label>
                                    <select class="form-control" id="pipeline" name="pipeline" onchange="getPipelineUsers(this.value)">
                                        <option value="" hidden <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == '') echo 'selected'; ?>>Choose Pipeline</option>
                                        <option value="sender" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'sender') echo 'selected'; ?>>Senders</option>
                                        <option value="counsellor" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'counsellor') echo 'selected'; ?>>Counsellors</option>
                                        <option value="student" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'student') echo 'selected'; ?>>Student Referral</option>
                                        <option value="associates" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'associates') echo 'selected'; ?>>Associates</option>
                                    </select>
                                </div>
                            </div> -->

                            <!-- Pipeline User -->
                            <!-- <div class="col-12 col-md-6 mt-2">
                                <div class="form-group">
                                    <label for="pipeline_user" class="form-label">Pipeline User <small>(if any)</small></label>
                                    <select class="form-control" id="pipeline_user" name="pipeline_user">
                                        <option value="" hidden>Choose User</option>
                                    </select>
                                </div>
                            </div>
                        
                        </div> --> 

                
                        <!-- Submit Button -->
                        <div class="col-12 mt-4">
                            <div class="d-flex justify-content-end">
                                <button type="submit" class="btn btn-primary">Save Application</button>
                            </div>
                        </div>
                    </div>
                </form>

            </div>

            <!-- Course Details Tab -->
            <div class="tab-pane fade <?= ($activeTab == 2) ? 'show active' : ''; ?>" id="course" role="tabpanel">
                <?php if (!isset($edit_data['id'])) : ?>
                    <div class="alert alert-warning" role="alert">
                        Add basic info first
                    </div>
                <?php endif; ?>
               <form action="<?= base_url('admin/applications/' . (isset($edit_data['id']) ? 'edit_education/' . $edit_data['id'] : 'add_education')) ?>" method="post" enctype="multipart/form-data" class="row g-3">
                    
                    <!-- Academic Information Section -->
                    <div class="col-12">
                        <h4>Academic Information</h4>
                    </div>
                    <?php
                    if(isset($edit_data['id']))
                    { ?>
                        <input type="hidden" name="user_id" id="user_id" value="<?=$edit_data['id']?>" >
                    <?php
                    }
                    ?>
                    
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="highest_qualification" class="form-label">Highest Qualification<span class="text-danger">*</span></label>
                            <select class="form-control" id="highest_qualification" name="highest_qualification" required>
                                <option value="" disabled selected>Select Qualification</option>
                                <option value="High School" <?php if (isset($edit_data['highest_qualification']) && $edit_data['highest_qualification'] == 'High School') echo 'selected'; ?>>High School</option>
                                <option value="Senior Secondary" <?php if (isset($edit_data['highest_qualification']) && $edit_data['highest_qualification'] == 'Senior Secondary') echo 'selected'; ?>>Senior Secondary</option>
                                <option value="Bachelor's" <?php if (isset($edit_data['highest_qualification']) && $edit_data['highest_qualification'] == "Bachelor's") echo 'selected'; ?>>Bachelor's</option>
                                <option value="Master's" <?php if (isset($edit_data['highest_qualification']) && $edit_data['highest_qualification'] == "Master's") echo 'selected'; ?>>Master's</option>
                                <option value="PhD" <?php if (isset($edit_data['highest_qualification']) && $edit_data['highest_qualification'] == 'PhD') echo 'selected'; ?>>PhD</option>
                            </select>
                        </div>
                    </div>

                    
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="previous_school" class="form-label">School/College<span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="previous_school" name="previous_school" placeholder="Enter School/College" required value="<?= isset($edit_data['previous_school']) ? $edit_data['previous_school'] : '' ?>">
                        </div>
                    </div>
                    
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="year_of_passing" class="form-label">Year of Passing<span class="text-danger">*</span></label>
                            <input type="number" class="form-control numbersOnly" id="year_of_passing" name="year_of_passing" placeholder="Enter Year of Passing" min="1900" max="2099" step="1" required value="<?= isset($edit_data['year_of_passing']) ? $edit_data['year_of_passing'] : '' ?>">
                        </div>
                    </div>
                    
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="percentage_grade" class="form-label">Percentage/Grade<span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="percentage_grade" name="percentage_grade" placeholder="Enter Percentage or Grade" required value="<?= isset($edit_data['percentage_or_grade']) ? $edit_data['percentage_or_grade'] : '' ?>">
                        </div>
                    </div>
                    
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="teaching_experience" class="form-label">Teaching Experience (Years, if any)</label>
                            <input type="number" class="form-control" id="teaching_experience" name="teaching_experience" placeholder="Enter Years of Teaching Experience" min="0" step="1" value="<?= isset($edit_data['teaching_experience']) ? $edit_data['teaching_experience'] : '' ?>">
                        </div>
                    </div>
                    
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="employment_status" class="form-label">Current Employment Status<span class="text-danger">*</span></label>
                            <select class="form-control" id="employment_status" name="employment_status" required>
                                <option value="" disabled selected>Select Employment Status</option>
                                <option value="Employed" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Employed') echo 'selected'; ?>>Employed</option>
                                <option value="Unemployed" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Unemployed') echo 'selected'; ?>>Unemployed</option>
                                <option value="Freelance" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Freelance') echo 'selected'; ?>>Freelance</option>
                                <option value="Student" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Student') echo 'selected'; ?>>Student</option>
                                <option value="Other" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Other') echo 'selected'; ?>>Other</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="col-12" id="employment_details"     style="<?php echo (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Employed') ? 'display: block;' : 'display: none;'; ?>"> 
                        <div class="row">
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="organization_name" class="form-label">Organization Name<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control textOnly" id="organization_name" name="organization_name" placeholder="Enter Organization Name" value="<?= isset($edit_data['organization_name']) ? $edit_data['organization_name'] : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="designation" class="form-label">Position/Designation<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="designation" name="designation" placeholder="Enter Position/Designation" value="<?= isset($edit_data['designation']) ? $edit_data['designation'] : '' ?>">
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="experience_years" class="form-label">Years of Experience<span class="text-danger">*</span></label>
                                    <input type="number" class="form-control" id="experience_years" name="experience_years" placeholder="Enter Years of Experience" min="0" step="1" value="<?= isset($edit_data['experience_years']) ? $edit_data['experience_years'] : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="industry_sector" class="form-label">Industry/Sector<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="industry_sector" name="industry_sector" placeholder="Enter Industry/Sector" value="<?= isset($edit_data['industry_sector']) ? $edit_data['industry_sector'] : '' ?>">
                                </div>
                            </div>
                        </div>
                    </div>


                     <hr>
                
                    <!-- Work/Professional Information Section -->
                    <div class="col-12">
                        <h4>Upload Certificates</h4>
                    </div>
                    
                    <div class="col-12">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Sl No</th>
                                            <th>Qualification</th>
                                            <th>Board/University</th>
                                            <th>Percentage</th>
                                            <th>Degree Upload <small class="text-danger">**</small></th>
                                            <th>Marksheet Upload <small class="text-danger">**</small></th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                                                        <tbody id="qualification-rows">
                                        <?php
                                        $qualifications = ['High_school', 'Senior_Secondary', 'Degree', 'Post_Graduate'];
                                        foreach ($qualifications as $index => $qual) :
                                            $board = isset($qualification[$index]['board']) ? $qualification[$index]['board'] : '';
                                            $percentage = isset($qualification[$index]['percentage']) ? $qualification[$index]['percentage'] : '';
                                            $certificate = isset($qualification[$index]['certificate']) ? $qualification[$index]['certificate'] : '';
                                            $marksheet = isset($qualification[$index]['marksheet']) ? $qualification[$index]['marksheet'] : '';
                                        ?>
                                            <tr>
                                                <td><?= $index + 1 ?></td>
                                                <td>
                                                    <input type="hidden" name="qualification[]" value="<?= $qual ?>">
                                                    <?= $qual ?>
                                                </td>
                                                <td>
                                                    <input type="text" name="board[]" class="form-control" value="<?= $board ?>" <?= isset($edit_data['id']) ? '' : 'readonly' ?>>
                                                </td>
                                                <td>
                                                    <input type="number" name="percentage[]" class="form-control" min="0" max="100" value="<?= $percentage ?>" <?= isset($edit_data['id']) ? '' : 'readonly' ?>>
                                                </td>
                                                <td>
                                                    <?= !empty($certificate) ? '<a href="' . base_url(get_file($certificate)) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>
                                                    <input type="file" name="certificate[]" class="form-control mt-2" accept=".pdf,.jpg,.jpeg,.png" <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                                    <?php if (empty($certificate)) : ?>
                                                        <small class="text-danger">File not uploaded</small>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <?= !empty($marksheet) ? '<a href="' . base_url(get_file($marksheet)) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>
                                                    <input type="file" name="marksheet[]" class="form-control" accept=".pdf,.jpg,.jpeg,.png" <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                                    <?php if (empty($marksheet)) : ?>
                                                        <small class="text-danger">File not uploaded</small>
                                                    <?php endif; ?>
                                                </td>
                                                <td>
                                                    <?php if (isset($edit_data['id'])) : ?>
                                                        <button type="button" class="btn btn-sm btn-danger delete-row"
                                                            onclick="delete_modal('<?= base_url('app/academic/delete_qualification?id=' . $edit_data['id'] . '&qual=' . $qual) ?>')">
                                                            Delete
                                                        </button>
                                                    <?php else : ?>
                                                        <button type="button" class="btn btn-sm btn-danger" disabled>Delete</button>
                                                    <?php endif; ?>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>

                                </table>
                                
                                <small class="text-danger">** Supported File types : .pdf, .jpg, .jpeg, .png</small>
                            </div>
                        </div>

                
                    <!-- Work/Professional Information Section -->
                    <!-- <div class="col-12">
                        <h4>Work/Professional Information</h4>
                    </div> -->
                    
                    <!-- <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="employment_status" class="form-label">Current Employment Status<span class="text-danger">*</span></label>
                            <select class="form-control" id="employment_status" name="employment_status" required>
                                <option value="" disabled selected>Select Employment Status</option>
                                <option value="Employed" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Employed') echo 'selected'; ?>>Employed</option>
                                <option value="Unemployed" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Unemployed') echo 'selected'; ?>>Unemployed</option>
                                <option value="Freelance" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Freelance') echo 'selected'; ?>>Freelance</option>
                                <option value="Student" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Student') echo 'selected'; ?>>Student</option>
                                <option value="Other" <?php if (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Other') echo 'selected'; ?>>Other</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="col-12" id="employment_details"     style="<?php echo (isset($edit_data['employment_status']) && $edit_data['employment_status'] == 'Employed') ? 'display: block;' : 'display: none;'; ?>"> 
                        <div class="row">
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="organization_name" class="form-label">Organization Name<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control textOnly" id="organization_name" name="organization_name" placeholder="Enter Organization Name" value="<?= isset($edit_data['organization_name']) ? $edit_data['organization_name'] : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="designation" class="form-label">Position/Designation<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="designation" name="designation" placeholder="Enter Position/Designation" value="<?= isset($edit_data['designation']) ? $edit_data['designation'] : '' ?>">
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="experience_years" class="form-label">Years of Experience<span class="text-danger">*</span></label>
                                    <input type="number" class="form-control" id="experience_years" name="experience_years" placeholder="Enter Years of Experience" min="0" step="1" value="<?= isset($edit_data['experience_years']) ? $edit_data['experience_years'] : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="industry_sector" class="form-label">Industry/Sector<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="industry_sector" name="industry_sector" placeholder="Enter Industry/Sector" value="<?= isset($edit_data['industry_sector']) ? $edit_data['industry_sector'] : '' ?>">
                                </div>
                            </div>
                        </div>
                    </div> -->
                
                    <!-- Save Button -->
                    <div class="col-12">
                        <div class="text-end">
                            <button class="btn btn-primary" type="submit" <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                <i class="ri-check-fill me-1"></i>Save
                            </button>
                        </div>
                    </div>
                </form>
            </div>


            <!-- Qualification Tab -->
            <div class="tab-pane fade <?= ($activeTab == 3) ? 'show active' : ''; ?>" id="qualification" role="tabpanel">
                <?php if (!isset($edit_data['id'])) : ?>
                    <div class="alert alert-warning" role="alert">
                        Add basic info first
                    </div>
                <?php endif; ?>
                <form id="qualificationForm"
                    action="<?= isset($edit_data['id']) ? base_url('admin/applications/enrol_course/' . $edit_data['id']) : '#' ?>"
                    method="post" enctype="multipart/form-data" class="row g-3">
                
                    <!-- Course Selection Section -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="course" class="form-label">Course<span class="text-danger">*</span></label>
                            <select class="form-control" id="course" name="course" required>
                                <option value="0">Select Course</option>
                                <?php foreach ($course as $val) { ?>
                                    <option value="<?= $val['id'] ?>" <?= isset($edit_data['course_id']) && $edit_data['course_id'] == $val['id'] ? 'selected' : '' ?>>
                                        <?= $val['title'] ?>
                                    </option>
                                <?php } ?>
                            </select>
                        </div>
                    </div>
                
                    <!-- Batch Details Section -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="batch_name" class="form-label">Batch Details<span class="text-danger">*</span></label>
                            <select class="form-control" id="batch_id" name="batch_id" required>
                                <option value="" disabled selected>Select Batch</option>
                                <?php foreach ($batch as $val) { ?>
                                    <option value="<?= $val['id'] ?>" <?= isset($edit_data['batch_id']) && $edit_data['batch_id'] == $val['id'] ? 'selected' : '' ?>>
                                        <?= $val['title'] ?>
                                    </option>
                                <?php } ?>
                            </select>
                        </div>
                    </div>
                
                    <!-- Enrollment Date Section -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="enrollment_date" class="form-label">Enrollment Date<span class="text-danger">*</span></label>
                            <input type="date" class="form-control" id="enrollment_date" name="enrollment_date" required
                                value="<?= isset($edit_data['enrollment_date']) ? $edit_data['enrollment_date'] : '' ?>">
                        </div>
                    </div>
                
                    <!-- Enrollment Status Section -->
                    <div class="col-12 col-md-6 d-none">
                        <div class="form-group">
                            <label for="enrollment_status" class="form-label">Enrollment Status<span class="text-danger">*</span></label>
                            <select class="form-control" id="enrollment_status" name="enrollment_status">
                                <option value="" disabled selected>Select Status</option>
                                <option value="Active" <?= isset($edit_data['enrollment_status']) && $edit_data['enrollment_status'] == 'Active' ? 'selected' : '' ?>>Active</option>
                                <option value="On Hold" <?= isset($edit_data['enrollment_status']) && $edit_data['enrollment_status'] == 'On Hold' ? 'selected' : '' ?>>On Hold</option>
                                <option value="Dropped" <?= isset($edit_data['enrollment_status']) && $edit_data['enrollment_status'] == 'Dropped' ? 'selected' : '' ?>>Dropped</option>
                                <option value="Alumni" <?= isset($edit_data['enrollment_status']) && $edit_data['enrollment_status'] == 'Alumni' ? 'selected' : '' ?>>Alumni</option>
                            </select>
                        </div>
                    </div>
                
                    <!-- Mode of Study Section -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="mode_of_study" class="form-label">Mode of Study<span class="text-danger">*</span></label>
                            <select class="form-control" id="mode_of_study" name="mode_of_study" required>
                                <option value="" disabled selected>Select Mode</option>
                                <option value="Online" <?= isset($edit_data['mode_of_study']) && $edit_data['mode_of_study'] == 'Online' ? 'selected' : '' ?>>Online</option>
                                <option value="Offline" <?= isset($edit_data['mode_of_study']) && $edit_data['mode_of_study'] == 'Offline' ? 'selected' : '' ?>>Offline</option>
                                <option value="Hybrid" <?= isset($edit_data['mode_of_study']) && $edit_data['mode_of_study'] == 'Hybrid' ? 'selected' : '' ?>>Hybrid</option>
                            </select>
                        </div>
                    </div>
                
                    <!-- Preferred Language Section -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="preferred_language" class="form-label">Preferred Language for Learning<span class="text-danger">*</span></label>
                            <select class="form-control" id="preferred_language" name="preferred_language" required>
                                <option value="" disabled selected>Select Language</option>
                                <?php foreach ($language as $val) { ?>
                                    <option value="<?= $val['id'] ?>" <?= isset($edit_data['preferred_language']) && $edit_data['preferred_language'] == $val['id'] ? 'selected' : '' ?>>
                                        <?= $val['title'] ?>
                                    </option>
                                <?php } ?>
                            </select>
                        </div>
                    </div>

                    <!-- Pipeline -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="pipeline" class="form-label">Pipeline</label>
                            <select class="form-control" id="pipeline" name="pipeline" onchange="getPipelineUsers(this.value)">
                                <option value="" hidden <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == '') echo 'selected'; ?>>Choose Pipeline</option>
                                <option value="sender" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'sender') echo 'selected'; ?>>Senders</option>
                                <option value="counsellor" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'counsellor') echo 'selected'; ?>>Counsellors</option>
                                <option value="student" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'student') echo 'selected'; ?>>Student Referral</option>
                                <option value="associates" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'associates') echo 'selected'; ?>>Associates</option>
                            </select>
                        </div>
                    </div> 

                    <!-- Pipeline User -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="pipeline_user" class="form-label">Pipeline User <small>(if any)</small></label>
                            <select class="form-control" id="pipeline_user" name="pipeline_user">
                                <option value="" hidden>Choose User</option>
                            </select>
                        </div>
                    </div>
                    
                    
                    <!-- Save Button -->
                    <div class="col-12">
                        <div class="text-end">
                            <button class="btn btn-primary" type="submit" <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                <i class="ri-check-fill me-1"></i>Save
                            </button>
                        </div>
                    </div>
                    
                </form>
            </div>

            <!-- Course Fee Tab -->
            <div class="tab-pane fade <?= ($activeTab == 4) ? 'show active' : ''; ?>" id="course_fee" role="tabpanel">
                <div class="row g-3">

                    <!-- Course Title -->
                    <?php if (isset($this->data['edit_data']['course_id']) && !empty($this->data['edit_data']['course_id'])) { ?>
                        <div class="container py-4">
                            <div class="row g-4">
                                <div class="col-12">
                                    <h3 class="text-center fw-bold mb-4"><?= $course_details['title'] ?></h3>
                                </div>

                                <!-- Fee Structure -->
                                <div class="col-12 col-lg-6">
                                    <div class="card border-0 shadow-lg rounded-4 h-100">
                                        <div class="card-header bg-success bg-gradient text-white p-3 rounded-top-4">
                                            <h5 class="mb-0 d-flex align-items-center text-white">
                                                <i class="ri-money-dollar-circle-line me-2"></i>
                                                Fee Structure
                                            </h5>
                                        </div>
                                        <ul class="list-group list-group-flush">
                                            <?php 
                                            if(!empty($course_details['fee_structure']))
                                            {
                                                foreach (json_decode($course_details['fee_structure'], true) as $fee_structure) 
                                                { ?>
                                                    <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                                                        <span class="fw-semibold text-dark"><?= $fee_structure['name'] ?></span>
                                                        <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fs-5">
                                                            ₹<?= $fee_structure['amount'] ?>
                                                        </span>
                                                    </li>
                                                <?php 
                                                }
                                            
                                            } ?>
                                        </ul>
                                    </div>
                                </div>

                                <!-- Summary Section -->
                                <div class="col-12 col-lg-6">
                                    <div class="card border-0 shadow-lg rounded-4 h-100">
                                        <div class="card-header bg-secondary bg-gradient text-white p-3 rounded-top-4">
                                            <h5 class="mb-0 d-flex align-items-center text-white">
                                                <i class="ri-file-list-3-line me-2"></i>
                                                Payment Summary
                                            </h5>
                                        </div>
                                        <ul class="list-group list-group-flush">
                                            <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                                                <span class="fw-semibold text-dark">Total Amount</span>
                                                <span class="badge bg-success bg-opacity-10 text-success px-3 py-2 fs-5">
                                                    ₹<?= $course_details['total_amount'] ?>
                                                </span>
                                            </li>
                                            <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                                                <span class="fw-semibold text-dark">Paid Amount</span>
                                                <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2 fs-5">
                                                    ₹<?= $course_details['paid_amount'] ?>
                                                </span>
                                            </li>
                                            <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                                                <span class="fw-semibold text-dark">Pending Amount</span>
                                                <span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 fs-5">
                                                    ₹<?= $course_details['pending_amount'] ?>
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>


                            </div>
                        </div>
                    <?php } ?>




                    <!-- Payment Table -->
                    <div class="col-12">
                       
                        <!-- Add Payment Button -->
                        <div class="col-12">
                            <div class="text-end mt-3">
                                <button class="btn btn-primary rounded-3 <?= isset($edit_data['id']) && !empty($this->data['edit_data']['course_id']) ? '' : 'disabled' ?>"
                                    onclick="show_ajax_modal('<?= base_url('admin/student_fee/add/' . (isset($edit_data['id']) ? $edit_data['id'] : '')) ?>', 'Add payment')">
                                    <i class="ri-add-line me-2"></i>
                                    Add Payment
                                </button>
                            </div>
                        </div>
                        
                        <div class="card">
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class=" table table-bordered">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Sl No</th>
                                                <th>Installment Details</th>
                                                <th>Amount</th>
                                                <th>Due Date</th>
                                                <th>Mode of Payment</th>
                                                <th>Payment To</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="payment-rows">
                                            <?php if (isset($edit_data['id']) && !empty($this->data['edit_data']['course_id'])) : ?>
                                                <?php foreach ($payments as $key => $payment): ?>
                                                    <tr>
                                                        <td><?= $key + 1; ?></td>
                                                        <td><?= htmlspecialchars($payment['installment_details']); ?></td>
                                                        <td>INR <?= htmlspecialchars($payment['amount']); ?></td>
                                                        <td><?= date('d/m/Y', strtotime($payment['due_date'])); ?></td>
                                                        <td><?= htmlspecialchars($payment['payment_mode']); ?></td>
                                                        <td><?= htmlspecialchars($payment['payment_to']); ?></td>
                                                        <td>
                                                            <?php
                                                            $today = date('Y-m-d');
                                                            $due_date = $payment['due_date'];

                                                            if ($payment['status'] === 'Pending' && $due_date < $today) {
                                                                echo '<span class="badge bg-danger">Overdue</span>';
                                                            } elseif ($due_date === $today) {
                                                                echo '<span class="badge bg-info">Due</span>';
                                                            } else {
                                                                switch ($payment['status']) {
                                                                    case 'Paid':
                                                                        echo '<span class="badge bg-success">Paid</span>';
                                                                        break;
                                                                    case 'Pending':
                                                                        echo '<span class="badge bg-warning">Pending</span>';
                                                                        break;
                                                                    default:
                                                                        echo '<span class="badge bg-light text-dark">Unknown</span>';
                                                                        break;
                                                                }
                                                            }
                                                            ?>
                                                        </td>
                                                        <td>
                                                            <a onclick="show_ajax_modal('<?= base_url('admin/student_fee/edit/' . $payment['id']) ?>', 'Edit payment')" class="btn btn-sm btn-primary">
                                                                <i class="ri-pencil-line"></i>
                                                            </a>
                                                            <a onclick="delete_modal('<?= base_url('admin/student_fee/delete/?id=' . $payment['id'] . '&student_id=' . $payment['user_id']) ?>')" class="btn btn-sm btn-danger">
                                                                <i class="ri-delete-bin-line"></i>
                                                            </a>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            <?php else : ?>
                                                <div class="alert alert-warning" role="alert">
                                                    Please provide basic information and course details first.
                                                </div>
                                            <?php endif; ?>
                                        </tbody>

                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <!-- Documents Tab -->
            <div class="tab-pane fade <?= ($activeTab == 5) ? 'show active' : ''; ?>" id="documents" role="tabpanel">
                <div class="row g-3">
                <?php if (!isset($edit_data['id'])) : ?>
                    <div class="alert alert-warning" role="alert">
                        Add basic info first
                    </div>
                <?php endif; ?>
                
                    <div class="text-end">
                        <a class="btn mb-2 btn-secondary <?= isset($edit_data['id']) ? '' : 'disabled' ?>"
                            onclick="show_ajax_modal('<?= base_url('admin/applications/document_add/' . (isset($edit_data['id']) ? $edit_data['id'] : '')) ?>', 'Add Document')">
                            <i class="ri-add-line"></i> Add Document
                        </a>
                    </div>

                    <div class="col-12">
                        <div class="table-responsive">
                            <table class=" table table-bordered">
                                <thead class="table-light">
                                    <tr>
                                        <th>Sl No</th>
                                        <th>Label</th>
                                        <th>Document</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="qualification-rows">
                                    <?php if (isset($edit_data['id']) && !empty($documents)) : ?>
                                        <?php foreach ($documents as $index => $doc): ?>
                                            <tr>
                                                <td><?= $index + 1 ?></td>
                                                <td><?= htmlspecialchars($doc['label']); ?></td>
                                                <td>
                                                    <?= !empty($doc['file']) ? '<a href="' . base_url(get_file($doc['file'])) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>
                                                </td>
                                                <td>
                                                    <button type="button" class="btn btn-sm btn-secondary"
                                                        onclick="show_ajax_modal('<?= base_url('admin/applications/document_edit/' . $doc['student_document_id'] . '?student_id=' . $edit_data['id']) ?>', 'Update Document')">
                                                        Update
                                                    </button>
                                                    <button type="button" class="btn btn-sm btn-danger"
                                                        onclick="delete_modal('<?= base_url('admin/applications/document_delete/' . $doc['student_document_id'] . '?student_id=' . $edit_data['id']) ?>')">
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else : ?>
                                        
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            
              <div class="tab-pane fade <?= ($activeTab == 6) ? 'show active' : ''; ?>" id="lms" role="tabpanel">
                <div class="row g-3">
                    
                    <form action="<?= base_url('admin/applications/' . (isset($edit_data['id']) ? 'edit_info/' . $edit_data['id'] : 'add_info')) ?>" method="post" enctype="multipart/form-data" class="row g-3">

                        <?php if (!isset($edit_data['id'])) : ?>
                            <div class="alert alert-warning" role="alert">
                                Add basic info first
                            </div>
                        <?php endif; ?>

                        <div class="col-12 col-md-6 d-none">
                            <div class="form-group">
                                <label for="username" class="form-label">Username<span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="username" name="username" placeholder="Enter Username" value="<?= isset($edit_data['username']) ? $edit_data['username'] : '' ?>" autocomplete="off">
                                <!-- <?= isset($edit_data['phone']) ? $edit_data['phone'] : '' ?> -->
                            </div>
                        </div>
                        
                        <?php
                        
                        if(empty($edit_data['password']))
                        { ?>
                        
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="password" class="form-label">Password<span class="text-danger">*</span></label>
                                <input type="password" class="form-control" id="password" name="password" placeholder="Enter Password" required value="<?= isset($edit_data['password']) ? $edit_data['password'] : '' ?>" autocomplete="off">
                            </div>
                        </div>
                    <?php
                        }
                        ?>
                        
                        <div class="col-12 col-md-6 d-none">
                            <div class="form-group">
                                <label for="learning_times" class="form-label">Preferred Learning Times</label>
                                <select class="form-control" id="learning_times" name="learning_times">
                                    <option value="morning" <?php if (isset($edit_data['learning_times']) && $edit_data['learning_times'] == 'morning') echo 'selected'; ?>>Morning</option>
                                    <option value="afternoon" <?php if (isset($edit_data['learning_times']) && $edit_data['learning_times'] == 'afternoon') echo 'selected'; ?>>Afternoon</option>
                                    <option value="evening" <?php if (isset($edit_data['learning_times']) && $edit_data['learning_times'] == 'evening') echo 'selected'; ?>>Evening</option>
                                </select>
                            </div>
                        </div>
                        
                         <!-- Save Button -->
                        <div class="col-12">
                            <div class="text-end">
                                <button class="btn btn-primary" type="submit" <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                    <i class="ri-check-fill me-1"></i>Save
                                </button>
                            </div>
                        </div>
                        
                 </form>   

                </div>
            </div>


        </div>
    </div>
</div>

<style>
    .nav-tabs .nav-link {
        color: #6c757d;
        border: none;
        padding: 0.75rem 1rem;
        font-weight: 500;
    }

    .nav-tabs .nav-link.active {
        color: #006943;
        ;
        border-bottom: 2px solid #006943;
        background: none;
    }

    .nav-tabs .nav-link:hover {
        border-color: transparent;
        isolation: isolate;
    }

    .card {
        border: none;
        border-radius: 0.5rem;
    }

    .form-control,
    .form-select {
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
    }

    .form-label {
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    .btn-success {
        background-color: #006943;
        border-color: #006943;
    }

    .btn-success:hover {
        background-color: #006943;
        border-color: #006943;
    }
</style>


<!-- Add Cropper.js CSS -->
<link href="https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.css" rel="stylesheet" />
<!-- Add Cropper.js JS -->
<script src="https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.js"></script>
        
<script>
    // Add Installment Row
    document.getElementById('add_installment').addEventListener('click', function () {
        const installmentTableBody = document.getElementById('installment_table_body');
        const newRow = `
            <tr>
                <td><input type="number" class="form-control" name="installment_amount[]" placeholder="Enter Amount" min="0"></td>
                <td><input type="date" class="form-control" name="due_date[]"></td>
                <td><button type="button" class="btn btn-danger btn-sm remove-installment">Remove</button></td>
            </tr>`;
        installmentTableBody.insertAdjacentHTML('beforeend', newRow);
    });

    // Remove Installment Row
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-installment')) {
            e.target.closest('tr').remove();
        }
    });

    // Add Receipt Row
    document.getElementById('add_receipt').addEventListener('click', function () {
        const receiptTableBody = document.getElementById('receipt_table_body');
        const newRow = `
            <tr>
                <td><input type="text" class="form-control" name="receipt_number[]" placeholder="Enter Receipt Number"></td>
                <td><input type="date" class="form-control" name="payment_date[]"></td>
                <td><button type="button" class="btn btn-danger btn-sm remove-receipt">Remove</button></td>
            </tr>`;
        receiptTableBody.insertAdjacentHTML('beforeend', newRow);
    });

    // Remove Receipt Row
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-receipt')) {
            e.target.closest('tr').remove();
        }
    });

</script>

<script>
    document.getElementById('same_as_permanent').addEventListener('change', function () {
        const permanentAddress = document.getElementById('address').value;
        const nativeAddress = document.getElementById('native_address');
        if (this.checked) {
            nativeAddress.value = permanentAddress;
            nativeAddress.setAttribute('readonly', true); // Prevent user editing
        } else {
            nativeAddress.value = '';
            nativeAddress.removeAttribute('readonly');
        }
    });

    // Sync Permanent Address updates to Correspondence Address when checked
    document.getElementById('address').addEventListener('input', function () {
        const sameAsPermanentCheckbox = document.getElementById('same_as_permanent');
        if (sameAsPermanentCheckbox.checked) {
            document.getElementById('native_address').value = this.value;
        }
    });
</script>
<script>
    $(document).ready(function() {
        $('#same_address').change(function() {
            if ($(this).is(':checked')) {
                $('#native_address').val($('#address').val());
            } else {
                $('#native_address').val('');
            }
        });
    });
</script>
<script>
    // Show/Hide Employment Details Section Based on Employment Status
    document.getElementById('employment_status').addEventListener('change', function () {
        const employmentDetails = document.getElementById('employment_details');
        if (this.value === 'Employed' || this.value === 'Freelance') 
        {
            employmentDetails.style.display = 'block';
            document.getElementById('organization_name').required = true;
            document.getElementById('designation').required = true;
            document.getElementById('experience_years').required = true;
            document.getElementById('industry_sector').required = true;
        } else {
            employmentDetails.style.display = 'none';
            document.getElementById('organization_name').required = false;
            document.getElementById('designation').required = false;
            document.getElementById('experience_years').required = false;
            document.getElementById('industry_sector').required = false;
        }
    });
</script>

<script>
    // basic info section ////////////////////////////////////////////////
    $(document).ready(function() {
        $('.select2').select2({});

        // Set max date for DOB
        document.getElementById('DOB').max = new Date().toISOString().split('T')[0];

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

        $('input[name="copy_option"]').on('change', function() {
             const selectedOption = $(this).val();

            if (selectedOption === "copy_from_phone") {
                const code = $('select[name="code"]').val();           // phone country code
                const number = $('#phone').val();                      // phone number
                $('#whatsapp_no').val(code + number);                  // combine
            } else if (selectedOption === "copy_from_second_phone") {
                const code = $('select[name="second_code"]').val();    // second phone country code
                const number = $('#second_phone').val();               // second phone number
                $('#whatsapp_no').val(code + number);                  // combine
            }
        });

        document.getElementById('DOB').addEventListener('input', function() {
            const dob = new Date(this.value);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear() - (today < new Date(dob.setFullYear(today.getFullYear())) ? 1 : 0);
            document.getElementById('age').value = age >= 0 ? age : '';
        });

        // Initialize age on page load if DOB has a value
        document.getElementById('DOB').dispatchEvent(new Event('input'));

    });

    // Basic course section ////////////////////////////////////////////////

    function getCourses(university_id) {
        if (university_id) {
            $.ajax({
                url: '<?php echo base_url("admin/academic/get_courses/"); ?>' + university_id,
                type: 'GET',
                success: function(data) {
                    console.log(data);

                    $('#courses').empty();

                    const preSelectedCourse = <?= isset($edit_data['course_id']) ? $edit_data['course_id'] : 'null'; ?>;

                    if (Array.isArray(data) && data.length > 0) {
                        $('#courses').append('<option value="">Choose any course</option>');

                        data.forEach(function(course) {
                            const isSelected = preSelectedCourse == course.id ? 'selected' : '';
                            $('#courses').append(
                                `<option value="${course.id}" ${isSelected}>${course.title}</option>`
                            );
                        });
                    } else {
                        $('#courses').append('<option disabled value="">No courses under this university</option>');
                    }

                    $('#courses').trigger('change');
                },
                error: function(xhr, status, error) {
                    console.error(`Error during AJAX request: ${status} - ${error}`);
                }
            });
        } else {
            $('#courses').empty().append('<option disabled value="">Choose any university first</option>');
            $('#courses').trigger('change');
        }
    }

    $('#university_id').change(function() {
        const university_id = $(this).val();
        getCourses(university_id);
    });

    <?php if (isset($edit_data['university_id'])): ?>
        getCourses(<?= $edit_data['university_id'] ?>);
    <?php endif; ?>

    function getStates(selectedCountry, selectedState = null) {

        const districtsDropdown = $('#districts');
        const districtInput = $('#district-input');

        // reset district fields
        districtsDropdown.empty().append('<option value="">Choose district</option>');
        districtInput.val('');

        if (selectedCountry) {
            const statesDropdown = $('#states');
            statesDropdown.empty();
            statesDropdown.append('<option value="" disabled selected>--Processing--</option>');

            $.ajax({
                url: 'https://countriesnow.space/api/v0.1/countries/states',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    country: selectedCountry
                }),
                success: function(response) {
                    if (response.error === false && response.data.states) {
                        console.log(response);

                        statesDropdown.empty();
                        statesDropdown.append('<option value="">Choose state</option>');

                        response.data.states.forEach(function(state) {
                            const isSelected = selectedState == state.name ? 'selected' : '';
                            statesDropdown.append(`<option value="${state.name}" ${isSelected}>${state.name}</option>`);
                        });
                    } else {
                        alert('No states found for the selected country.');
                    }
                },
                error: function() {
                    alert('Error fetching states. Please try again.');
                }
            });
        } else {
            console.error("Selected country is invalid.");
        }
    }

    <?php if (isset($edit_data['country_id']) && isset($country_code[$edit_data['country_id']])): ?>
        getStates('<?= $country_code[$edit_data['country_id']] ?>', '<?= $edit_data['state'] ?>');
    <?php endif; ?>

    // For INDIA, use dropdown; For others, use input
    function getDistrictsByState(selectedState, selectedDist = null) {
        let countryName = $("#country_id option:selected").text();

        const districtsDropdown = $('#districts');
        const districtInput = $('#district-input');

        if (countryName === "INDIA") {
            // Show dropdown
            districtsDropdown.removeClass('d-none').prop("disabled", false);
            districtInput.addClass('d-none').prop("disabled", true);

            $.getJSON('<?= base_url() ?>assets/admin/json/states-and-districts.json', function(data) {
                const stateData = data.states.find(state => state.state == selectedState);

                districtsDropdown.empty();
                districtsDropdown.append('<option value="">Choose district</option>');

                if (stateData) {
                    stateData.districts.forEach(function(district) {
                        const isSelected = selectedDist == district ? 'selected' : '';
                        districtsDropdown.append(`<option value="${district}" ${isSelected}>${district}</option>`);
                    });
                }
            });

        } else {
            // Show text input for other countries
            districtsDropdown.addClass('d-none').prop("disabled", true);
            districtInput.removeClass('d-none').prop("disabled", false);
        }
    }

    // function getStates(selectedCountry, selectedState = null) { const districtsDropdown = $('#districts'); districtsDropdown.empty(); districtsDropdown.append('<option value="">Choose district</option>'); if (selectedCountry) { const statesDropdown = $('#states'); statesDropdown.empty(); statesDropdown.append('<option value="" disabled selected>--Processing--</option>'); $.ajax({ url: 'https://countriesnow.space/api/v0.1/countries/states', type: 'POST', contentType: 'application/json', data: JSON.stringify({ country: selectedCountry }), success: function(response) { if (response.error === false && response.data.states) { console.log(response); statesDropdown.empty(); statesDropdown.append('<option value="">Choose state</option>'); response.data.states.forEach(function(state) { const isSelected = selectedState == state.name ? 'selected' : ''; statesDropdown.append(<option value="${state.name}" ${isSelected}>${state.name}</option>); }); } else { alert('No states found for the selected country.'); } }, error: function() { alert('Error fetching states. Please try again.'); } }); } else { console.error("Selected country is invalid."); } } <?php if (isset($edit_data['country_id']) && isset($country_code[$edit_data['country_id']])): ?> getStates('<?= $country_code[$edit_data['country_id']] ?>', '<?= $edit_data['state'] ?>'); <?php endif; ?> function getDistrictsByState(selectedState, selectedDist = null) { $.getJSON('<?= base_url() ?>assets/admin/json/states-and-districts.json', function(data) { const stateData = data.states.find(state => state.state == selectedState); const districtsDropdown = $('#districts'); districtsDropdown.empty(); districtsDropdown.append('<option value="">Choose district</option>'); stateData.districts.forEach(function(district) { const isSelected = selectedDist == district ? 'selected' : ''; districtsDropdown.append(<option value="${district}" ${isSelected}>${district}</option>); }); }); }

    <?php if (isset($edit_data['state'])): ?>
        getDistrictsByState('<?= $edit_data['state'] ?>', '<?= $edit_data['district'] ?>');
    <?php endif; ?>
</script>

<script>

    function getPipelineUsers(pipeline) {
        let roleMap = {
            sender: 11,
            counsellor: 9,
            student: 2,
            associates: 10
        };

        let role_id = roleMap[pipeline];

        if (!role_id) {
            $('#pipeline_user').html('<option value="">Choose User</option>');
            return;
        }

        $.ajax({
            url: '<?= base_url('admin/applications/get_pipeline_users') ?>',
            type: 'POST',
            data: { role_id: role_id },
            success: function(response) {
                
                let options = '';
                if (response.length > 0) {
                    options += '<option value="">Choose User</option>';
                    response.forEach(function(user) {
                        options += `<option value="${user.id}">${user.name}</option>`;
                    });
                } else {
                    options += '<option value="">No users found</option>';
                }
                $('#pipeline_user').html(options);
            }
        });
    }               
</script>
<script>
document.getElementById("basicForm").addEventListener("submit", function (e) {
    let aadhar = document.getElementById("aadhar_no").value.trim();
    let passport = document.getElementById("passport_no").value.trim();

    if (aadhar === "" && passport === "") {
        e.preventDefault();
        alert("Please enter either Aadhaar Number or Passport Number.");
    }
});
</script>
<script>
$(document).ready(function(){
    let typingTimer;
    const doneTypingInterval = 800; // ms

    $('#email').on('input', function() {
        clearTimeout(typingTimer);
        const email = $(this).val();
        if(email.length < 5) return; // skip short text

        typingTimer = setTimeout(function() {
            $.ajax({
                url: "<?= base_url('admin/applications/ajax_verify_email') ?>",
                method: "POST",
                data: {email: email},
                dataType: "json",
                success: function(res){
                    if(res.status){
                        $('#email').removeClass('is-invalid').addClass('is-valid');
                        $('#emailFeedback').remove();
                        $('#email').after('<div id="emailFeedback" class="valid-feedback">'+res.message+'</div>');
                    } else {
                        $('#email').removeClass('is-valid').addClass('is-invalid');
                        $('#emailFeedback').remove();
                        $('#email').after('<div id="emailFeedback" class="invalid-feedback">'+res.message+'</div>');
                    }
                }
            });
        }, doneTypingInterval);
    });
});
</script>