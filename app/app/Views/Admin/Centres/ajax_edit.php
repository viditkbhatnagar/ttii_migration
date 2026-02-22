<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/centres/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
             <div class="row">
        
                <div class="col-lg-6 p-2">
                    <div>
                        <label for="code" class="form-label">Name<span class="required text-danger">*</span></label>
                        <input type="text" class="form-control textOnly" id="name" name="name"  value="<?=$edit_data['name'] ?>" required>
                    </div>
                </div>
                <div class="col-lg-6 p-2">
                    <div>
                        <label for="name" class="form-label">User Image</label>
                        <input type="file" class="form-control" id="image" name="image" >
                    </div>
                </div>
                
                <div class="col-lg-6 p-2">
                    <div>
                        <label for="phone" class="form-label">Phone<span class="required text-danger">*</span></label>
                        <div class="input-group">
                                <div class="col-sm-3">
                                    <select class="form-control  select2" name="code" required="">
                                        <option value="91" <?=($edit_data['country_code'] == 91) ? 'selected' : '';?>>91 - INDIA</option>
                                        <option value="1" <?=($edit_data['country_code'] == 1) ? 'selected' : '';?>>1 - UNITED STATES</option>
                                        <option value="358" <?=($edit_data['country_code'] == 358) ? 'selected' : '';?>>358 - FINLAND</option>
                                        <option value="33" <?=($edit_data['country_code'] == 33) ? '33selected' : '';?>>33 - FRANCE</option>
                                        <option value="49" <?=($edit_data['country_code'] == 49) ? 'selected' : '';?>>49 - GERMANY</option>
                                        <option value="61"<?=($edit_data['country_code'] == 61) ? 'selected' : '';?>>61 - AUSTRALIA</option>
                                        <option value="353" <?=($edit_data['country_code'] == 353) ? 'selected' : '';?>>353 - IRELAND</option>
                                        <option value="39" <?=($edit_data['country_code'] == 39) ? 'selected' : '';?>>39 - ITALY</option>
                                        <option value="965" <?=($edit_data['country_code'] == 965) ? 'selected' : '';?>>965 - KUWAIT</option>
                                        <option value="370" <?=($edit_data['country_code'] == 370) ? 'selected' : '';?>>370 - LITHUANIA</option>
                                        <option value="64" <?=($edit_data['country_code'] == 64) ? 'selected' : '';?>>64 - NEW ZEALAND</option>
                                        <option value="968" <?=($edit_data['country_code'] == 968) ? 'selected' : '';?>>968 - OMAN</option>
                                        <option value="48" <?=($edit_data['country_code'] == 48) ? 'selected' : '';?>>48 - POLAND</option>
                                        <option value="974" <?=($edit_data['country_code'] == 974) ? 'selected' : '';?>>974 - QATAR</option>
                                        <option value="966" <?=($edit_data['country_code'] == 966) ? 'selected' : '';?>>966 - SAUDI ARABIA</option>
                                        <option value="34" <?=($edit_data['country_code'] == 34) ? 'selected' : '';?>>34 - SPAIN</option>
                                        <option value="46" <?=($edit_data['country_code'] == 46) ? 'selected' : '';?>>46 - SWEDEN</option>
                                        <option value="971" <?=($edit_data['country_code'] == 971) ? 'selected' : '';?>>971 - UNITED ARAB EMIRATES</option>
                                        <option value="44" <?=($edit_data['country_code'] == 44) ? 'selected' : '';?>>44 - UNITED KINGDOM</option>
                                    </select>
                                </div>
                                <div class="col-sm-9">
                                    <input type="text" name="phone" id="phone" class="form-control numbersOnly" maxinput="15" placeholder="Enter phone no" required="" value="<?=$edit_data['phone']?>">
                                </div>
                            </div>
                    </div>
                </div>
                
                <div class="col-lg-6 p-2">
                    <div>
                        <label for="email" class="form-label">Email<span class="required text-danger">*</span></label>
                        <input type="email" class="form-control" id="email" name="email" value="<?=$edit_data['user_email'] ?>" required>
                    </div>
                </div>
                
                <div class="col-lg-6 p-2">
                    <div>
                        <label for="password" class="form-label">password (Without Space)<span class="required text-danger">*</span></label>
                        <input type="password" class="form-control" id="password" name="password">
                    </div>
                </div>
                
                <div class="col-lg-6 p-2">
                    <div>
                        <label for="zoom_id" class="form-label">Zoom id (Without Space)<span class="required text-danger">*</span></label>
                        <input type="text" class="form-control" id="zoom_id" name="zoom_id" value="<?=$edit_data['email'] ?>">
                    </div>
                </div>
                
                <div class="col-lg-6 p-2">
                    <div>
                        <label for="zoom_password" class="form-label">Zoom password (Without Space)<span class="required text-danger">*</span></label>
                        <input type="password" class="form-control" id="zoom_password" name="zoom_password">
                    </div>
                </div>
                
                
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