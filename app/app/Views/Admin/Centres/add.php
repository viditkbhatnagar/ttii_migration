
<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/dashboard/index') ?>">Dashboard</a></li>
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/centres/index') ?>">Centre</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <form action="<?=base_url('admin/centres/add')?>" enctype="multipart/form-data" method="post" id="centreAddform">

                <div class="card-header align-items-center d-flex">
                    <h4 class="card-title mb-0 flex-grow-1">Basic Centre Information</h4>
                </div>
                
                
                <div class="card-body">
                        <div class="row">
            
            <div class="col-lg-6 p-2">
                <div>
                    <label for="centre_id" class="form-label">Centre ID<span class="required text-danger">*</span></label>
                    <input type="text" class="form-control textOnly" id="centre_id" name="centre_id" required value="<?=$next_id?? ''?>" readonly>
                </div>
            </div>
            <div class="col-lg-6 p-2">
                <div>
                    <label for="centre_name" class="form-label">Centre Name<span class="required text-danger">*</span></label>
                    <input type="text" class="form-control textOnly" id="centre_name" name="centre_name" required>
                </div>
            </div>
            
             <div class="col-lg-4 p-2">
                <label for="country_id" class="form-label">Country<span class="required text-danger">*</span></label>
                <select class="form-select select2" name="country_id" id="country_id" onchange="getStates(this.options[this.selectedIndex].text)">
                    <option value="">Choose country</option>
                        <?php foreach ($country_code as $code => $country) {
                        $selected = (isset($edit_data['code']) && $edit_data['code'] == $code) ? 'selected' : '';
                        echo "<option value=\"$code\" $selected>$country</option>";
                        } ?>
                </select>
            </div>
            <div class="col-lg-4 p-2">
                <label for="state_id" class="form-label">State<span class="required text-danger">*</span></label>
                <select id="states" name="state_id" class="form-select select2" onchange="getDistrictsByState(this.value)">
                    <option value="">Select State</option>
                </select>
            </div>
            <div class="col-lg-4 p-2">
                <label for="district_id" class="form-label">District<span class="required text-danger">*</span></label>
                <select id="districts" name="district_id" class="form-select select2">
                    <option value="">Select District</option>
                </select>
            </div>
            
              <div class="col-lg-6 p-2">
                <label for="address" class="form-label">Address<span class="required text-danger">*</span></label>
                
                <textarea class="form-control" required name="address" required></textarea>
            </div>
      
           
        </div>
                </div>
                
                <div class="card-header align-items-center d-flex">
                    <h4 class="card-title mb-0 flex-grow-1">Contact Information</h4>
                </div>
                
                
                <div class="card-body">
                        <div class="row">
            
            <div class="col-lg-6 p-2">
                <div>
                    <label for="contact_person" class="form-label">Contact Person Name<span class="required text-danger">*</span></label>
                    <input type="text" class="form-control textOnly" id="contact_person" name="contact_person" required>
                </div>
            </div>
            
             <div class="col-lg-6 p-2">
                <div>
                    <label for="contact_person_designation" class="form-label">Designation<span class="required text-danger">*</span></label>
                    <input type="text" class="form-control textOnly" id="contact_person_designation" name="contact_person_designation" required>
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
                    <label for="whatsapp" class="form-label">Whatsapp<span class="required text-danger">*</span></label>
                    <div class="input-group">
                        <div class="col-sm-3">
                            <select class="form-control  select2" name="whatsapp_code" required="">
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
                            <input type="text" name="whatsapp" id="whatsapp" class="form-control numbersOnly" maxinput="15" placeholder="Enter phone no" required="">
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
                    <label for="secondary_phone" class="form-label">Alternative Phone<span class="required text-danger">*</span></label>
                    <div class="input-group">
                        <div class="col-sm-3">
                            <select class="form-control  select2" name="secondary_code" required="">
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
                            <input type="text" name="secondary_phone" id="secondary_phone" class="form-control numbersOnly" maxinput="15" placeholder="Enter phone no" required="">
                        </div>
                    </div>
                </div>
            </div>

            
            
            
            
        </div>
                </div>
                
                <div class="card-header align-items-center d-flex">
                    <h4 class="card-title mb-0 flex-grow-1">Affiliation Information</h4>
                </div>
                
                
                <div class="card-body">
                        <div class="row">
            
            <div class="col-lg-6 p-2">
                <div>
                    <label for="date_of_registration" class="form-label">Date of Registration<span class="required text-danger">*</span></label>
                    <input type="date" class="form-control " id="date_of_registration" name="date_of_registration" required>
                </div>
            </div>
            <div class="col-lg-6 p-2">
                <div>
                    <label for="date_of_expiry" class="form-label">Date of Expiry<span class="required text-danger">*</span></label>
                    <input type="date" class="form-control " id="date_of_expiry" name="date_of_expiry" required>
                </div>
            </div>
            
            <div class="col-lg-6 p-2">
                <label for="registraion_certificate" class="form-label">Registration Certificate</label>
                <input class="form-control" type="file" id="formFile" name="registraion_certificate"/>
            </div>  
            
            <div class="col-lg-6 p-2">
                <label for="affiliation_document" class="form-label">Affiliation Document</label>
                <input class="form-control" type="file" id="formFile2" name="affiliation_document"/>
            </div>  
            
            
            <!--<div class="col-lg-12 p-2 mt-1">-->
            <!--    <label for="attachment" class="form-label">Affiliation Documents</label>-->
            <!--    <div class="dropzone" id="attachment-dropzone"></div>-->
            <!--</div>-->
            
            <div class="card-header align-items-center d-flex mt-3">
                    <h4 class="card-title mb-0 flex-grow-1">Login credentials</h4>
            </div>
                    <div class="card-body">
                        <div class="row">
            
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="password" class="form-label">Password *</label>
                                    <div class="input-group">
                                        <input type="password" class="form-control" id="password" name="password" required>
                                        <button class="btn btn-outline-secondary" type="button" id="togglePassword">
                                        <i class="ri-eye-close-line"></i>
                                        </button>
                                    </div>
                                    <span class="text-sm" class="form-text text-muted">*Login email same as the contact email</span>
                                    <script>
                                        const togglePassword = document.querySelector('#togglePassword');
                                        const passwordInput = document.querySelector('#password');

                                        togglePassword.addEventListener('click', function () {
                                            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                                            passwordInput.setAttribute('type', type);

                                            // toggle icon
                                            this.querySelector('i').classList.toggle('ri-eye-line');
                                            this.querySelector('i').classList.toggle('ri-eye-close-line');
                                        });
                                    </script>
                                </div>
                            </div>
                        </div>
                    </div>
            
            
            <div class="col-12 p-2">
                <button class="btn btn-success float-end btn-save" type="submit">
                    <i class="ri-check-fill"></i> Save
                </button>
            </div>
        </div>
                </div>
                
            </form>
        </div>
    </div>
</div><!--end row-->

<script>
$(document).ready(function () {
    
    $(".numbersOnly").on("input", function () {
        $(this).val($(this).val().replace(/[^0-9]/g, ""));
    });
    
    $(".textOnly").on("input", function () {
        $(this).val($(this).val().replace(/[^a-zA-Z\s]/g, ""));
    });
    
    $("#secondary_phone").on("change", function () {
        var phone = $("#phone").val();
        var secondaryPhone = $(this).val();

        if (phone === secondaryPhone) {
            alert("Secondary phone number cannot be the same as the primary phone number.");
            $(this).val("").focus();
        }
    });
});
</script>
<script>
    $(document).ready(function() 
    {
        $('.select2').select2({});

        // Initialize Dropzone for attachment upload
        if (Dropzone.instances.length > 0) {
            Dropzone.instances.forEach(function(dropzone) {
                dropzone.destroy();
            });
        }

    // Then initialize Dropzone
    var myDropzone = new Dropzone("#attachment-dropzone", {
    url: "<?= base_url('admin/centres/upload_affiliation_document') ?>",
    paramName: "file",
    maxFiles: 4,
    maxFilesize: 500, // MB
    acceptedFiles: "application/pdf,image/jpeg,image/png", // Allow PDFs, JPEG, and PNG images
    init: function() {
        this.on("success", function(file, response) {
            console.log("File uploaded successfully", response);
            $('<input>').attr({
                type: 'hidden',
                id: 'uploadedFileName',
                name: 'uploadedFileName',
                value: response.filename // Adjust based on your response structure
            }).appendTo('#centreAddform');
        });
    }
});

});

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
    

</script>
