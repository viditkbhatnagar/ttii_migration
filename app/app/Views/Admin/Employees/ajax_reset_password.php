<?php
    if (isset($employee_id)){
        ?>
        <form action="<?=base_url('app/employees/reset_password/'.$employee_id)?>" name="password_reset" method="post" enctype="multipart/form-data">
            <div class="row">
                <div class="col-lg-12">
        
                    <div class="mb-3">
                        <label for="name" class="form-label">Password</label>
                        <div class="position-relative auth-pass-inputgroup mb-3">
                            <input type="password" class="form-control pe-5 password-input" placeholder="Enter password" name="password" id="password-input">
                            <button class="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon" type="button" id="password-addon"><i class="ri-eye-fill align-middle"></i></button>
                        </div>
                    </div>
        
                    <div class="mb-3">
                        <label for="name" class="form-label">Password</label>
                        <div class="position-relative auth-pass-inputgroup mb-3">
                            <input type="password" class="form-control pe-5 password-input" placeholder="Enter password" name="confirm_password" id="confirm-password-input">
                            <button class="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon" type="button" id="password-addon"><i class="ri-eye-fill align-middle"></i></button>
                            <div id="password-error" class="error-message text-danger"></div>
                        </div>
                        <div id="password-error" class="error-message text-danger"></div>
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
<script src="https://project.trogon.info/codeace/assets/app/js/pages/password-addon.init.js"></script>
<!--profile image-->
<script>

    $(function() {
        $("form[name='password_reset']").submit(function(e) {
             // prevent actual form submit
            var password = $('#password-input').val();
            var confirm_password = $('#confirm-password-input').val();
            var passwordError = document.getElementById('password-error');
    
            if (password.length < 6) {
                e.preventDefault();
                passwordError.textContent = "Password should be at least 6 characters long!";
                return false; // Prevent form submission
            } else if (password !== confirm_password) {
                e.preventDefault();
                passwordError.textContent = "Passwords do not match!";
                return false; // Prevent form submission
            } 
        });
    });

	
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
</script>