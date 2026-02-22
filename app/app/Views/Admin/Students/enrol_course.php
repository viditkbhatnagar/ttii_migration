<form id="qualificationForm"
                        action="<?= isset($edit_data['user_id']) ? base_url('admin/students/enrol_course/' . $edit_data['user_id']) : '#' ?>"
                        method="post" enctype="multipart/form-data" class="row g-3">
                    
                        <!-- Course Selection Section -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="course" class="form-label">Course<span class="text-danger">*</span></label>
                                <select class="form-control" id="course" name="course" required>
                                    <option value="0">Select Course</option>
                                    <?php foreach ($course as $val) { ?>
                                        <option value="<?= $val['id'] ?>" >
                                            <?= $val['title'] ?>
                                        </option>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>
                    
                        <!-- Batch Details Section -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="batch_name" class="form-label">Intake Details<span class="text-danger">*</span></label>
                                <select class="form-control" id="batch_id" name="batch_id" required>
                                    <option value="" disabled selected>Select Intake</option>
                                    <?php foreach ($batch as $val) { ?>
                                        <option value="<?= $val['id'] ?>" >
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
                                    value="">
                            </div>
                        </div>
                    
                        <!-- Enrollment Status Section -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="enrollment_status" class="form-label">Enrollment Status<span class="text-danger">*</span></label>
                                <select class="form-control" id="enrollment_status" name="enrollment_status" required>
                                    <option value="" disabled selected>Select Status</option>
                                    <option value="Active" >Active</option>
                                    <option value="On Hold" >On Hold</option>
                                    <option value="Dropped" >Dropped</option>
                                    <option value="Alumni" >Alumni</option>
                                </select>
                            </div>
                        </div>
                    
                        <!-- Mode of Study Section -->
                        <div class="col-12 col-md-6">
                            <div class="form-group">
                                <label for="mode_of_study" class="form-label">Mode of Study<span class="text-danger">*</span></label>
                                <select class="form-control" id="mode_of_study" name="mode_of_study" required>
                                    <option value="" disabled selected>Select Mode</option>
                                    <option value="Online" >Online</option>
                                    <option value="Offline" >Offline</option>
                                    <option value="Hybrid" >Hybrid</option>
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
                                        <option value="<?= $val['id'] ?>" >
                                            <?= $val['title'] ?>
                                        </option>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Pipeline -->
                        <div class="col-12 col-md-6 d-none">
                            <div class="form-group">
                                <label for="pipeline" class="form-label">Pipeline <small>(if any)</small></label>
                                <select class="form-control" id="pipeline" name="pipeline" onchange="getPipelineUsers(this.value)">
                                    <option value="" hidden <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == '') echo 'selected'; ?>>Choose Pipeline</option>
                                    <option value="centre" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'centre') echo 'selected'; ?>>Centres</option>
                                    <option value="counsellor" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'counsellor') echo 'selected'; ?>>Counsellors</option>
                                    <option value="student" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'student') echo 'selected'; ?>>Student Referral</option>
                                    <option value="associates" <?php if (isset($edit_data['pipeline']) && $edit_data['pipeline'] == 'associates') echo 'selected'; ?>>Associates</option>
                                </select>
                            </div>
                        </div> 

                        <!-- Pipeline User -->
                        <div class="col-12 col-md-6 d-none">
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
                                <button class="btn btn-primary" type="submit" <?= isset($edit_data['user_id']) ? '' : 'disabled' ?>>
                                    <i class="ri-check-fill me-1"></i>Save
                                </button>
                            </div>
                        </div>
                        
                    </form>

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