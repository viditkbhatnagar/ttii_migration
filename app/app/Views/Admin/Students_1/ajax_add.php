<!-- Navigation breadcrumb -->
<div class="card shadow ">
    <div class="d-flex justify-content-between align-items-center m-4">
        <h4 class="text-primary mb-0"><?= $page_title ?></h4>
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-0">
                <li class="breadcrumb-item"><a href="#" class="text-muted">Students</a></li>
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
                <a href="<?= isset($edit_data['id']) ? base_url('app/students/edit/' . $edit_data['id'] . '?active=1') : base_url('app/students/ajax_add?active=1') ?>"
                    class="nav-link <?= ($activeTab == 1) ? 'active' : ''; ?>"
                    id="basic-tab"
                    aria-selected="<?= ($activeTab == 1) ? 'true' : 'false'; ?>">
                    <i class="ri-user-line me-1"></i>Basic Info
                </a>
            </li>
            <li class="nav-item" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('app/students/edit/' . $edit_data['id'] . '?active=2') : base_url('app/students/ajax_add?active=2') ?>"
                    class="nav-link <?= ($activeTab == 2) ? 'active' : ''; ?>"
                    id="course-tab"
                    aria-selected="<?= ($activeTab == 2) ? 'true' : 'false'; ?>">
                    <i class="ri-book-open-line me-1"></i>Course Details
                </a>
            </li>
            <li class="nav-item" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('app/students/edit/' . $edit_data['id'] . '?active=3') : base_url('app/students/ajax_add?active=3') ?>"
                    class="nav-link <?= ($activeTab == 3) ? 'active' : ''; ?>"
                    id="qualification-tab"
                    aria-selected="<?= ($activeTab == 3) ? 'true' : 'false'; ?>">
                    <i class="ri-graduation-cap-line me-1"></i>Qualification
                </a>
            </li>
            <li class="nav-item" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('app/students/edit/' . $edit_data['id'] . '?active=4') : base_url('app/students/ajax_add?active=4') ?>"
                    class="nav-link <?= ($activeTab == 4) ? 'active' : ''; ?>"
                    id="course-fee-tab"
                    aria-selected="<?= ($activeTab == 4) ? 'true' : 'false'; ?>">
                    <i class="ri-money-dollar-circle-line me-1"></i>Course Fee
                </a>
            </li>
            <li class="nav-item" role="presentation">
                <a href="<?= isset($edit_data['id']) ? base_url('app/students/edit/' . $edit_data['id'] . '?active=5') : base_url('app/students/ajax_add?active=5') ?>"
                    class="nav-link <?= ($activeTab == 5) ? 'active' : ''; ?>"
                    id="documents-tab"
                    aria-selected="<?= ($activeTab == 5) ? 'true' : 'false'; ?>">
                    <i class="ri-folder-line me-1"></i>Documents
                </a>
            </li>
        </ul>



        <!-- Tabs Content -->
        <div class="tab-content" id="studentTabsContent">
            <!-- Basic Info Tab -->
            <div class="tab-pane fade <?= ($activeTab == 1) ? 'show active' : ''; ?>" id="basic" role="tabpanel">
                <?php if (isset($edit_data['id'])) { ?>
                    <form action="<?= base_url('app/students/edit/' . $edit_data['id']) ?>" method="post" enctype="multipart/form-data">
                    <?php } else { ?>
                        <form action="<?= base_url('app/students/add') ?>" method="post" enctype="multipart/form-data"> <?php } ?>
                        <h4>#<?= $sequance ?></h4>
                        <div class="row g-3">

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
                                            <?php if (isset($edit_data['profile_picture'])) { ?>
                                                <img src="<?= base_url(get_file($edit_data['profile_picture'])) ?>"
                                                    id="user-profile-img"
                                                    class="avatar-md rounded-circle h-auto" />
                                            <?php } else { ?>
                                                <img src="<?= base_url() ?>assets/app/images/place-holder/profile-place-holder.jpg"
                                                    id="user-profile-img"
                                                    class="avatar-md rounded-circle h-auto" />
                                            <? } ?>
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

                            <!-- Enrollment Date -->
                            <div class="col-12 col-md-6">

                                <div class="form-group">
                                    <label for="enrollment_date" class="form-label">Enrollment Date<span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" id="enrollment_date" name="enrollment_date" required value="<?= isset($edit_data['enrollment_date']) ? $edit_data['enrollment_date'] : '' ?>">
                                </div>
                            </div>

                            <!-- Name -->
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="name" class="form-label">Full Name<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="name" name="name" placeholder="Enter student name" required value="<?= isset($edit_data['name']) ? $edit_data['name'] : '' ?>">
                                </div>
                            </div>

                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="DOB" class="form-label">Date of Birth<span class="text-danger">*</span></label>
                                    <input type="date" class="form-control" id="DOB" name="DOB" required value="<?= isset($edit_data['dob']) ? $edit_data['dob'] : '' ?>">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="age" class="form-label">Age</label>
                                    <input type="text" class="form-control" id="age" name="age" disabled>
                                </div>
                            </div>


                            <!-- Gender -->
                            <div class="col-12 col-md-6">
                                <label for="gender" class="form-label">Gender<span class="text-danger">*</span></label>
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
                                    <label for="nationality" class="form-label">Nationality<span class="text-danger">*</span></label>
                                    <select class="form-select select2" name="nationality" id="nationality" required>
                                        <option value="0">Choose country</option>
                                        <?php foreach ($countries as $country_id => $country) {
                                            $selected = (isset($edit_data['nationality']) && $edit_data['nationality'] == $country_id) ? 'selected' : '';
                                            echo "<option value=\"{$country_id}\" {$selected}>{$country['country']}</option>";
                                        } ?>
                                    </select>
                                </div>
                            </div>


                            <!-- Email -->
                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="email" class="form-label">Email<span class="text-danger">*</span></label>
                                    <input type="email" class="form-control" id="email" name="email" placeholder="Enter student email" required value="<?= isset($edit_data['email']) ? $edit_data['email'] : '' ?>">
                                </div>
                            </div>

                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="phone" class="form-label">Phone<span class="text-danger">*</span></label>
                                    <div class="input-group">
                                        <select class="form-control" name="code" style="max-width: 130px;" required>
                                            <?php
                                            foreach ($country_code as $code => $country) {
                                                $selected = (isset($edit_data['code']) && $edit_data['code'] == $code) ? 'selected' : '';
                                                echo "<option value=\"$code\" $selected>$code - $country</option>";
                                            }
                                            ?>
                                        </select>
                                        <input type="number" name="phone" id="phone" class="form-control" oninput="number_length(15, 'phone')" placeholder="Enter phone no" required value="<?= isset($edit_data['phone']) ? $edit_data['phone'] : '' ?>">
                                    </div>
                                </div>
                            </div>

                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="second_phone" class="form-label">Second Phone</label>
                                    <div class="input-group">
                                        <select class="form-control" name="code" style="max-width: 130px;" required>
                                            <?php
                                            foreach ($country_code as $code => $country) {
                                                $selected = (isset($edit_data['second_code']) && $edit_data['second_code'] == $code) ? 'selected' : '';
                                                echo "<option value=\"$code\" $selected>$code - $country</option>";
                                            }
                                            ?>
                                        </select>
                                        <input type="number" name="second_phone" id="second_phone" class="form-control" oninput="number_length(15, 'second_phone')" placeholder="Enter second phone no" value="<?= isset($edit_data['second_phone']) ? $edit_data['second_phone'] : '' ?>">
                                    </div>
                                </div>
                            </div>

                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="whatsapp_no" class="form-label">WhatsApp No</label>
                                    <div class="d-flex">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="copy_option" id="copy_from_phone" value="phone">
                                            <label class="form-check-label" for="copy_from_phone">Same as Phone</label>
                                        </div>
                                        <div class="form-check ms-1">
                                            <input class="form-check-input ms-1" type="radio" name="copy_option" id="copy_from_second_phone" value="second_phone">
                                            <label class="form-check-label" for="copy_from_second_phone">Same as Second Phone</label>
                                        </div>
                                    </div>

                                    <input type="tel" class="form-control" id="whatsapp_no" name="whatsapp_no" placeholder="Enter student WhatsApp No" value="<?= isset($edit_data['whatsapp_no']) ? $edit_data['whatsapp_no'] : '' ?>">
                                </div>
                            </div>

                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="country_id" class="form-label">Country</label>
                                    <select class="form-select select2" name="country_id" id="country_id" onchange="getStates(this.options[this.selectedIndex].text)">
                                        <option value="0">Choose country</option>
                                        <?php
                                        foreach ($country_code as $code => $country) {
                                            $selected = (isset($edit_data['code']) && $edit_data['code'] == $code) ? 'selected' : '';
                                            echo "<option value=\"$code\" $selected>$country</option>";
                                        }
                                        ?>
                                    </select>
                                </div>
                            </div>

                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="state" class="form-label">State</label>
                                    <select id="states" name="state" class="form-select select2" onchange="getDistrictsByState(this.value)">
                                        <option>--Choose a country first--</option>
                                    </select>
                                </div>
                            </div>

                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="district" class="form-label">District</label>
                                    <select id="districts" name="district" class="form-select select2">
                                        <option>--Choose a state first--</option>
                                    </select>
                                </div>
                            </div>

                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="address" class="form-label">Address<span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="address" name="address" placeholder="Enter student address" required value="<?= isset($edit_data['address']) ? $edit_data['address'] : '' ?>">
                                </div>
                            </div>

                            <div class="col-12 col-md-6">
                                <div class="form-group">
                                    <label for="student_status" class="form-label">Choose Student Status<span class="text-danger">*</span></label>
                                    <select class="form-select" name="status" id="student_status" required>
                                        <option value="">Select any status</option>
                                        <option value="1" <?= (isset($edit_data['status']) && $edit_data['status'] == '1') ? 'selected' : '' ?>>Active</option>
                                        <option value="0" <?= (isset($edit_data['status']) && $edit_data['status'] == '0') ? 'selected' : '' ?>>Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div class="col-12">
                                <div class="text-end">
                                    <button class="btn btn-success" type="submit">
                                        <i class="ri-check-fill me-1"></i>Save
                                    </button>
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
                <form action="<?= isset($edit_data['id']) ? base_url('app/academic/edit/' . $edit_data['id']) : '#' ?>"
                    method="post" class="row g-3">
                    <!-- University Selection -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="university_id" class="form-label">University Selection<span class="text-danger">*</span></label>
                            <select class="form-select select2" name="university_id" id="university_id" required <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                <option value="">Choose any university</option>
                                <?php
                                foreach ($universities as $key => $university) {
                                    $selected = (isset($edit_data['university_id']) && ($edit_data['university_id'] == $key)) ? 'selected' : '';
                                    echo "<option value=\"$key\" $selected>$university</option>";
                                }
                                ?>
                            </select>
                        </div>
                    </div>

                    <!-- Program Selection -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="courses" class="form-label">Course<span class="text-danger">*</span></label>
                            <select class="form-select select2" name="course_id" id="courses" required <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                <option value="">Choose any university first</option>
                            </select>
                        </div>
                    </div>

                    <!-- Mode -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="mode" class="form-label">Mode<span class="text-danger">*</span></label>
                            <select class="form-select select2" name="mode" id="mode" required <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                <option value="">Select Mode</option>
                                <option value="online" <?= (isset($edit_data['mode']) && $edit_data['mode'] == 'online') ? 'selected' : '' ?>>Online</option>
                                <option value="offline" <?= (isset($edit_data['mode']) && $edit_data['mode'] == 'offline') ? 'selected' : '' ?>>Offline</option>
                                <option value="hybrid" <?= (isset($edit_data['mode']) && $edit_data['mode'] == 'hybrid') ? 'selected' : '' ?>>Hybrid</option>
                            </select>
                        </div>
                    </div>

                    <!-- Session -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="session" class="form-label">Session<span class="text-danger">*</span></label>
                            <select class="form-select select2" name="session_id" id="session_id" required <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                <option value="">Select Mode</option>
                                <?php foreach ($sessions as $session) { ?>
                                    <option value="<?= $session['session_id'] ?>" <?= (isset($edit_data['session_id']) && $edit_data['session_id'] == $session['session_id']) ? 'selected' : '' ?>><?= $session['session_title'] ?></option>
                                <?php } ?>
                            </select>
                        </div>
                    </div>

                    <!-- Consultant Selection -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="consultant" class="form-label">Consultant Selection<span class="text-danger">*</span></label>
                            <select class="form-select select2" name="consultant_id" id="consultant_id" required <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                <option value="">Select Consultant</option>
                                <?php
                                foreach ($consultants as $key => $consultant) {
                                    $selected = (isset($edit_data['consultant_id']) && ($edit_data['consultant_id'] == $key)) ? 'selected' : '';
                                    echo "<option value=\"$key\" $selected>$consultant</option>";
                                }
                                ?>
                            </select>
                        </div>
                    </div>

                    <!-- Source -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="source" class="form-label">Source<span class="text-danger">*</span></label>
                            <select class="form-select select2" name="source" id="source" required <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                <option value="">Select Source</option>
                                <option value="referral" <?= (isset($edit_data['source']) && $edit_data['source'] == 'referral') ? 'selected' : '' ?>>Referral</option>
                                <option value="website" <?= (isset($edit_data['source']) && $edit_data['source'] == 'website') ? 'selected' : '' ?>>Website</option>
                                <option value="social media" <?= (isset($edit_data['source']) && $edit_data['source'] == 'social media') ? 'selected' : '' ?>>Social Media</option>
                                <option value="client" <?= (isset($edit_data['source']) && $edit_data['source'] == 'client') ? 'selected' : '' ?>>Client</option>
                                <option value="other" <?= (isset($edit_data['source']) && $edit_data['source'] == 'other') ? 'selected' : '' ?>>Other</option>
                            </select>
                        </div>
                    </div>

                    <!-- Status Selection -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="status" class="form-label">Status Selection<span class="text-danger">*</span></label>
                            <select class="form-select select2" name="admission_status" id="admission_status" required <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                <option value="">Select Status</option>
                                <option value="0" <?= (isset($edit_data['admission_status']) && $edit_data['admission_status'] == '0') ? 'selected' : '' ?>>In Progress</option>
                                <option value="1" <?= (isset($edit_data['admission_status']) && $edit_data['admission_status'] == '1') ? 'selected' : '' ?>>Applied</option>
                                <option value="2" <?= (isset($edit_data['admission_status']) && $edit_data['admission_status'] == '2') ? 'selected' : '' ?>>Completed</option>
                            </select>
                        </div>
                    </div>

                    <!-- Application ID -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="application_id" class="form-label">Application ID</label>
                            <input type="text" class="form-control" id="application_id" name="application_id" placeholder="Enter Application ID"
                                value="<?= isset($edit_data['application_id']) ? $edit_data['application_id'] : '' ?>"
                                <?= isset($edit_data['id']) ? '' : 'readonly' ?>>
                        </div>
                    </div>

                    <!-- Enrollment ID -->
                    <div class="col-12 col-md-6">
                        <div class="form-group">
                            <label for="enrollment_id" class="form-label">Enrollment ID</label>
                            <input type="text" class="form-control" id="enrollment_id" name="enrollment_id" placeholder="Enter Enrollment ID"
                                value="<?= isset($edit_data['enrollment_id']) ? $edit_data['enrollment_id'] : '' ?>"
                                <?= isset($edit_data['id']) ? '' : 'readonly' ?>>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="text-end">
                            <button class="btn btn-success" type="submit" <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
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
                    action="<?= isset($edit_data['id']) ? base_url('app/academic/edit_qualification/' . $edit_data['id']) : '#' ?>"
                    method="post"
                    enctype="multipart/form-data">
                    <div class="row g-3">
                        <div class="col-12">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Sl No</th>
                                            <th>Qualification</th>
                                            <th>Board/University</th>
                                            <th>Percentage</th>
                                            <th>Degree Upload</th>
                                            <th>Marksheet Upload</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="qualification-rows">
                                        <?php
                                        $qualifications = ['10th', '12th', 'Degree'];
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
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="text-end">
                                <button class="btn btn-success" type="submit" <?= isset($edit_data['id']) ? '' : 'disabled' ?>>
                                    <i class="ri-check-fill me-1"></i>Save
                                </button>
                            </div>
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
                                            <?php foreach (json_decode($course_details['fee_structure'], true) as $fee_structure) { ?>
                                                <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                                                    <span class="fw-semibold text-dark"><?= $fee_structure['name'] ?></span>
                                                    <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fs-5">
                                                        ₹<?= $fee_structure['amount'] ?>
                                                    </span>
                                                </li>
                                            <?php } ?>
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
                                    onclick="show_ajax_modal('<?= base_url('app/student_fee/add/' . (isset($edit_data['id']) ? $edit_data['id'] : '')) ?>', 'Add payment')">
                                    <i class="ri-add-line me-2"></i>
                                    Add Payment
                                </button>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="data_table_basic table table-bordered">
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
                                                            <a onclick="show_ajax_modal('<?= base_url('app/student_fee/edit/' . $payment['student_payment_id']) ?>', 'Edit payment')" class="btn btn-sm btn-primary">
                                                                <i class="ri-pencil-line"></i>
                                                            </a>
                                                            <a onclick="delete_modal('<?= base_url('app/student_fee/delete/?id=' . $payment['student_payment_id'] . '&student_id=' . $payment['student_id']) ?>')" class="btn btn-sm btn-danger">
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
                    <div class="text-end">
                        <a class="btn mb-2 btn-secondary <?= isset($edit_data['id']) ? '' : 'disabled' ?>"
                            onclick="show_ajax_modal('<?= base_url('app/students/document_add/' . (isset($edit_data['id']) ? $edit_data['id'] : '')) ?>', 'Add Document')">
                            <i class="ri-add-line"></i> Add Document
                        </a>
                    </div>

                    <div class="col-12">
                        <div class="table-responsive">
                            <table class="data_table_basic table table-bordered">
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
                                                        onclick="show_ajax_modal('<?= base_url('app/students/document_edit/' . $doc['student_document_id'] . '?student_id=' . $edit_data['id']) ?>', 'Update Document')">
                                                        Update
                                                    </button>
                                                    <button type="button" class="btn btn-sm btn-danger"
                                                        onclick="delete_modal('<?= base_url('app/students/document_delete/' . $doc['student_document_id'] . '?student_id=' . $edit_data['id']) ?>')">
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php else : ?>
                                        <div class="alert alert-warning" role="alert">
                                            Add basic info first
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
            const sourceValue = $(`#${selectedOption}`).val();
            $('#whatsapp_no').val(sourceValue);
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
                url: '<?php echo base_url("app/academic/get_courses/"); ?>' + university_id,
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
        districtsDropdown.empty();
        districtsDropdown.append('<option value="">Choose district</option>');

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

    <?php if (isset($edit_data['country_id'])): ?>
        getStates('<?= $country_code[$edit_data['country_id']] ?>', '<?= $edit_data['state'] ?>');
    <?php endif; ?>

    function getDistrictsByState(selectedState, selectedDist = null) {
        $.getJSON('<?= base_url() ?>assets/app/json/states-and-districts.json', function(data) {
            const stateData = data.states.find(state => state.state == selectedState);

            const districtsDropdown = $('#districts');
            districtsDropdown.empty();
            districtsDropdown.append('<option value="">Choose district</option>');

            stateData.districts.forEach(function(district) {
                const isSelected = selectedDist == district ? 'selected' : '';
                districtsDropdown.append(`<option value="${district}" ${isSelected}>${district}</option>`);
            });

        });
    }

    <?php if (isset($edit_data['state'])): ?>
        getDistrictsByState('<?= $edit_data['state'] ?>', '<?= $edit_data['district'] ?>');
    <?php endif; ?>
</script>