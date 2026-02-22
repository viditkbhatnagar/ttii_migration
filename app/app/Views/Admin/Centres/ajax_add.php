<form action="<?=base_url('admin/instructor/add')?>" enctype="multipart/form-data" method="post">
    <div class="row">
        
        <div class="col-lg-6 p-2">
            <div>
                <label for="code" class="form-label">Name<span class="required text-danger">*</span></label>
                <input type="text" class="form-control textOnly" id="name" name="name" required>
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
                        <option value="91">91 - INDIA</option>
                            <option value="1">1 - UNITED STATES</option>
                            <option value="358">358 - FINLAND</option>
                            <option value="33">33 - FRANCE</option>
                            <option value="49">49 - GERMANY</option>
                            <option value="61">61 - AUSTRALIA</option>
                            <option value="353">353 - IRELAND</option>
                            <option value="39">39 - ITALY</option>
                            <option value="965">965 - KUWAIT</option>
                            <option value="370">370 - LITHUANIA</option>
                            <option value="64">64 - NEW ZEALAND</option>
                            <option value="968">968 - OMAN</option>
                            <option value="48">48 - POLAND</option>
                            <option value="974">974 - QATAR</option>
                            <option value="966">966 - SAUDI ARABIA</option>
                            <option value="34">34 - SPAIN</option>
                            <option value="46">46 - SWEDEN</option>
                            <option value="971">971 - UNITED ARAB EMIRATES</option>
                            <option value="44">44 - UNITED KINGDOM</option>
                    </select>
                    </div>
                    <div class="col-sm-9">
                        <input type="text" name="phone" id="phone" class="form-control numbersOnly" maxinput="15" placeholder="Enter phone no" required="">
                    </div>
                </div>
            </div>
        </div>
        
        <div class="col-lg-6 p-2">
            <div>
                <label for="email" class="form-label">Email<span class="required text-danger">*</span></label>
                <input type="email" class="form-control" id="email" name="email" required>
            </div>
        </div>
        
        <div class="col-lg-6 p-2">
            <div>
                <label for="password" class="form-label">password (Without Space)<span class="required text-danger">*</span></label>
                <input type="password" class="form-control" id="password" name="password" required>
            </div>
        </div>
        
        <div class="col-lg-6 p-2">
            <div>
                <label for="zoom_id" class="form-label">Zoom id (Without Space)<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="zoom_id" name="zoom_id" required>
            </div>
        </div>
        
        <div class="col-lg-6 p-2">
            <div>
                <label for="zoom_password" class="form-label">Zoom password (Without Space)<span class="required text-danger">*</span></label>
                <input type="password" class="form-control" id="zoom_password" name="zoom_password" required>
            </div>
        </div>
        
        
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>

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