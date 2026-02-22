<?php
    if (isset($id)){
        ?>
        <form action="<?= base_url('admin/sub_admin/reset_password/' . $id) ?>" method="post" enctype="multipart/form-data" onsubmit="return validatePassword()">
            <div class="row">
                <div class="col-12 form-group p-2">
                    <div>
                        <label for="username" class="form-label">Username<span class="required text-danger">*</span></label>
                        <input type="text" class="form-control" id="username" name="username"  placeholder="Enter Username" value="<?= $edit_data['username'] ?>" />
                    </div>
                </div>
                <div class="col-12 form-group p-2">
                    <label for="password" class="form-label">Password<span class="required text-danger">*</span></label>
                    <div class="input-group">
                        <input type="password" class="form-control" name="password" id="password" required>
                        <span class="input-group-text" id="togglePassword" style="cursor: pointer;">
                            <i class="ri-eye-fill" id="eyeIcon"></i>
                        </span>
                    </div>
                    <div id="passwordError" class="text-danger mt-1" style="display: none;"></div>
                </div>
                <div class="col-12 form-group p-2">
                    <label for="confirm_password" class="form-label">Confirm Password<span class="required text-danger">*</span></label>
                    <div class="input-group">
                        <input type="password" class="form-control" name="confirm_password" id="confirm_password" required>
                        <span class="input-group-text" id="toggleConfirmPassword" style="cursor: pointer;">
                            <i class="ri-eye-fill" id="eyeIconConfirm"></i>
                        </span>
                    </div>
                    <div id="confirmPasswordError" class="text-danger mt-1" style="display: none;"></div>
                </div>
                <div class="col-12 p-2">
                    <button class="btn btn-success float-end" type="submit">
                        <i class="ri-check-fill"></i> Save
                    </button>
                </div>
            </div>
        </form>
        
        <script>
            // Function to toggle password visibility
            function togglePasswordVisibility(inputId, iconId) {
                const input = document.getElementById(inputId);
                const icon = document.getElementById(iconId);
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                icon.classList.toggle('ri-eye-fill');
                icon.classList.toggle('ri-eye-off-fill');
            }
        
            // Event listener for the main password toggle
            document.getElementById('togglePassword').addEventListener('click', function () {
                togglePasswordVisibility('password', 'eyeIcon');
            });
        
            // Event listener for the confirm password toggle
            document.getElementById('toggleConfirmPassword').addEventListener('click', function () {
                togglePasswordVisibility('confirm_password', 'eyeIconConfirm');
            });
        
            // Validate password match
            function validatePassword() {
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirm_password').value;
                let isValid = true;
        
                // Clear previous error messages
                document.getElementById('passwordError').style.display = 'none';
                document.getElementById('confirmPasswordError').style.display = 'none';
        
                if (password !== confirmPassword) {
                    document.getElementById('confirmPasswordError').innerText = 'Passwords do not match!';
                    document.getElementById('confirmPasswordError').style.display = 'block';
                    isValid = false; // Prevent form submission
                }
        
                return isValid; // Allow form submission if valid
            }
        </script>

        
        <?php
    }
?>