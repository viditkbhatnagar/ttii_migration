<style>
    .is-invalid {
    border-color: #dc3545;
    background-color: #f8d7da;
}

.nav-tabs .nav-link {
    border-radius: 5px;
    border: 1px solid #ddd;
    padding: 10px 15px;
    margin: 0 5px;
    background-color: #f8f9fa;
    transition: background-color 0.3s, box-shadow 0.3s;
}

.nav-tabs .nav-link.active {
    background-color: #4CAF50;
    color: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.nav-tabs {
    justify-content: center;
    border-bottom: none;
}


.form-steps {
    padding: 20px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.form-steps .form-group {
    margin-bottom: 15px;
}

.form-steps input,
.form-steps select,
.form-steps textarea {
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #ddd;
    transition: border-color 0.3s, box-shadow 0.3s;
}

.form-steps input:focus,
.form-steps select:focus,
.form-steps textarea:focus {
    border-color: #4CAF50;
    box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
}



button {
    padding: 10px 20px;
    border-radius: 5px;
    border: none;
    background-color: #4CAF50;
    color: white;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s;
}

button:hover {
    background-color: #45a049;
}

.nexttab, .previestab {
    margin: 0 5px;
}



body {
    font-family: 'Arial', sans-serif;
    background: linear-gradient(to right, #f8f9fa, #e0e0e0);
    padding: 20px;
}

.container {
    max-width: 900px;
    margin: 0 auto;
}

@media screen and (max-width: 768px) {
    .nav-tabs {
        flex-direction: column;
    }

    button {
        width: 100%;
    }
}

.nav-tabs .nav-link:hover {
    background-color: #e7fbe9;
    color: #4CAF50;
}

input[type="text"]:focus {
    outline: none;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
}

</style>

<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
    body {
        font-family: 'Poppins', sans-serif;
    }
</style>

<div class="row">
        <div class="col-12">
            <div class="page-title-box d-sm-flex align-items-center justify-content-between">
                <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

                <div class="page-title-right">
                    <ol class="breadcrumb m-0">
                        <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                        <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                    </ol>
                </div>

            </div>
        </div>
    </div>



<div class="row">
    <!-- end col -->
    <div class="col-xl-12">
        <div class="card">
            <div class="card-body">
                <form action="#" class="form-steps" autocomplete="off">
                    <div class="step-arrow-nav mb-4">
                        <ul class="nav nav-pills custom-nav nav-justified" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="tab-personal-info" data-bs-toggle="pill" data-bs-target="#content-personal-info" type="button" role="tab" aria-controls="content-personal-info" aria-selected="true">Personal Information</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-contact-info" data-bs-toggle="pill" data-bs-target="#content-contact-info" type="button" role="tab" aria-controls="content-contact-info" aria-selected="false">Contact Information</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-academic-info" data-bs-toggle="pill" data-bs-target="#content-academic-info" type="button" role="tab" aria-controls="content-academic-info" aria-selected="false">Academic Information</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-enrollment-details" data-bs-toggle="pill" data-bs-target="#content-enrollment-details" type="button" role="tab" aria-controls="content-enrollment-details" aria-selected="false">Enrollment Details</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-fee-info" data-bs-toggle="pill" data-bs-target="#content-fee-info" type="button" role="tab" aria-controls="content-fee-info" aria-selected="false">Fee Information</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-parent-info" data-bs-toggle="pill" data-bs-target="#content-parent-info" type="button" role="tab" aria-controls="content-parent-info" aria-selected="false">Parental/Guardian Info</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-work-info" data-bs-toggle="pill" data-bs-target="#content-work-info" type="button" role="tab" aria-controls="content-work-info" aria-selected="false">Work/Professional Info</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-documents" data-bs-toggle="pill" data-bs-target="#content-documents" type="button" role="tab" aria-controls="content-documents" aria-selected="false">Documents</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-lms" data-bs-toggle="pill" data-bs-target="#content-lms" type="button" role="tab" aria-controls="content-lms" aria-selected="false">LMS/CRM Specific Info</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-special-req" data-bs-toggle="pill" data-bs-target="#content-special-req" type="button" role="tab" aria-controls="content-special-req" aria-selected="false">Special Requirements</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="tab-marketing" data-bs-toggle="pill" data-bs-target="#content-marketing" type="button" role="tab" aria-controls="content-marketing" aria-selected="false">Marketing/Communication</button>
                            </li>
                        </ul>
                    </div>

                    <div class="tab-content">
                        <!-- Personal Information Tab -->
                        <div class="tab-pane fade show active" id="content-personal-info" role="tabpanel" aria-labelledby="tab-personal-info">
                            <div>
                                <h5>Personal Information</h5>
                                    <div class="row">
                                        <div class="col-lg-6 p-2">
                                            <label for="name" class="form-label">Name<span class="required text-danger">*</span></label>
                                            <input type="text" class="form-control textOnly" id="name" name="name" placeholder="Name" required>
                                        </div>
                                        <div class="col-lg-6 p-2">
                                            <label for="date_of_birth" class="form-label">Date of Birth<span class="required text-danger">*</span></label>
                                            <input type="date" class="form-control " id="date_of_birth" name="date_of_birth" placeholder="Name" required>
                                        </div>
                                        <div class="col-lg-6 p-2">
                                            <label for="age" class="form-label">Age<span class="required text-danger">*</span></label>
                                            <input type="text" class="form-control numberOnly" id="age" name="age" placeholder="Age" required>
                                        </div>
                                        <div class="col-lg-6 p-2">
                                            <label for="gender" class="form-label">Gender<span class="required text-danger">*</span></label>
                                            <select class="form-control" name="gender" id="gender" required>
                                                <option value="male">Male </option>
                                                <option value="female">Female</option>
                                            </select>
                                        </div>
                                        <div class="col-lg-6 p-2">
                                            <label for="nationality" class="form-label">Nationality<span class="required text-danger">*</span></label>
                                            <select class="form-control" name="nationality" id="nationality" required>
                                                <option value="indian">Indian </option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        
                                         <div class="col-lg-6 p-2">
                                            <label for="marital_status" class="form-label">Marital Status<span class="required text-danger">*</span></label>
                                            <select class="form-control" name="marital_status" id="marital_status" required>
                                                <option value="married">Married </option>
                                                <option value="not_married">Not Married</option>
                                            </select>
                                        </div>
                                        
                                        <div class="col-lg-6 p-2">
                                            <label for="aadhar_no" class="form-label">Aadhar Number<span class="required text-danger">*</span></label>
                                            <input type="text" class="form-control numberOnly" id="aadhar_no" name="aadhar_no" placeholder="0000 0000 0000 0000" required>
                                        </div>
                                        
                                        <div class="col-lg-6 p-2">
                                            <label for="passport_no" class="form-label">Passport Number<span class="required text-danger">*</span></label>
                                            <input type="text" class="form-control numberOnly" id="passport_no" name="passport_no" placeholder="Age" required>
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
                                                        <input type="text" name="phone" id="phone" class="form-control numbersOnly" maxlength="10" placeholder="Enter phone no" required="">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-lg-6 p-2">
                                            <label for="title" class="form-label">Profile Picture</label>
                                            <input type="file" class="form-control" id="image" name="image" >
                                        </div>
                                    </div>

                            </div>
                            <div class="d-flex justify-content-end">
                                <button type="button" class="btn btn-success nexttab" data-nexttab="tab-contact-info">Next</button>
                            </div>
                        </div>

                        <!-- Repeat Similar Structure for Other Tabs -->
                        <div class="tab-pane fade" id="content-contact-info" role="tabpanel" aria-labelledby="tab-contact-info">
                            <div>
                                <h5>Contact Information</h5>
                                    <div class="row">
                                        
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
                                                        <input type="text" name="phone" id="phone" class="form-control numbersOnly" maxlength="10" placeholder="Enter phone no" required="">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-lg-6 p-2">
                                            <div>
                                                <label for="alternate_phone" class="form-label">Alternate Phone<span class="required text-danger">*</span></label>
                                                <div class="input-group">
                                                    <div class="col-sm-3">
                                                        <select class="form-control  select2" name="alternate_code" required="">
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
                                                        <input type="text" name="alternate_phone" id="alternate_phone" class="form-control numbersOnly" maxlength="10" placeholder="Enter phone no" required="">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-lg-6 p-2">
                                            <div>
                                                <label for="whatsapp_phone" class="form-label">Whatsapp No<span class="required text-danger">*</span></label>
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
                                                        <input type="text" name="whatsapp_phone" id="whatsapp_phone" class="form-control numbersOnly" maxlength="10" placeholder="Enter phone no" required="">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-lg-6 p-2">
                                            <label for="email" class="form-label">Email<span class="required text-danger">*</span></label>
                                            <input type="email" class="form-control" id="email" name="email" placeholder="Email" required>
                                        </div>
                                        
                                         <div class="col-lg-6 p-2">
                                            <label for="country" class="form-label">Country<span class="required text-danger">*</span></label>
                                            <select class="form-control" name="country" id="country" required>
                                                <option value="">Select</option>
                                                
                                            </select>
                                        </div>
                                        
                                         <div class="col-lg-6 p-2">
                                            <label for="state" class="form-label">State<span class="required text-danger">*</span></label>
                                            <select class="form-control" name="state" id="state" required>
                                                <option value="">Select</option>

                                                
                                            </select>                                        
                                        </div>
                                        
                                         <div class="col-lg-6 p-2">
                                            <label for="district" class="form-label">District<span class="required text-danger">*</span></label>
                                            <select class="form-control" name="district" id="district" required>
                                                 <option value="">Select</option>

                                                
                                            </select>                                         
                                         </div>
                                      
                                      
                                    </div>

                            </div>
                            <div class="d-flex justify-content-between">
                                <button type="button" class="btn btn-light previestab" data-previous="tab-personal-info">Previous</button>
                                <button type="button" class="btn btn-success nexttab" data-nexttab="tab-academic-info">Next</button>
                            </div>
                        </div>

                        <!-- Add similar div structures for other tabs -->

                        <!-- Finish Tab Example -->
                        <div class="tab-pane fade" id="content-marketing" role="tabpanel" aria-labelledby="tab-marketing">
                            <div class="text-center">
                                <div class="avatar-md mt-5 mb-4 mx-auto">
                                    <div class="avatar-title bg-light text-success display-4 rounded-circle">
                                        <i class="ri-checkbox-circle-fill"></i>
                                    </div>
                                </div>
                                <h5>Well Done!</h5>
                                <p class="text-muted">You have completed the form.</p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
                
<script>
document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector(".form-steps");
    const navButtons = document.querySelectorAll(".nav-link");
    const nextButtons = document.querySelectorAll(".nexttab");
    const previousButtons = document.querySelectorAll(".previestab");

    // Persist data across tabs
    const inputs = form.querySelectorAll("input");
    inputs.forEach(input => {
        // Load saved data from localStorage
        const savedValue = localStorage.getItem(input.placeholder || input.name);
        if (savedValue) {
            input.value = savedValue;
        }

        // Save data to localStorage on input change
        input.addEventListener("input", () => {
            localStorage.setItem(input.placeholder || input.name, input.value);
        });
    });

    // Clear localStorage when the form is reset
    form.addEventListener("reset", () => {
        inputs.forEach(input => {
            localStorage.removeItem(input.placeholder || input.name);
        });
    });

    // Navigate to the next tab with validation
    nextButtons.forEach(button => {
        button.addEventListener("click", function () {
            const currentTabContent = button.closest(".tab-pane");
            const inputsInTab = currentTabContent.querySelectorAll("input[required]");
            let isValid = true;

            // Check if all required fields are filled
            inputsInTab.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add("is-invalid"); // Add error class
                } else {
                    input.classList.remove("is-invalid"); // Remove error class
                }
            });

            // Proceed to the next tab only if all required fields are valid
            if (isValid) {
                const nextTabId = this.dataset.nexttab;
                const nextTabButton = document.getElementById(nextTabId);
                if (nextTabButton) {
                    nextTabButton.click(); // Trigger tab change
                }
            }
        });
    });

    // Navigate to the previous tab
    previousButtons.forEach(button => {
        button.addEventListener("click", function () {
            const previousTabId = this.dataset.previous;
            const previousTabButton = document.getElementById(previousTabId);
            if (previousTabButton) {
                previousTabButton.click(); // Trigger tab change
            }
        });
    });

    // Handle navigation clicks
    navButtons.forEach(button => {
        button.addEventListener("click", function () {
            // Save the current tab state
            const activeTabId = document.querySelector(".nav-link.active")?.id;
            if (activeTabId) {
                localStorage.setItem("activeTab", activeTabId);
            }
        });
    });

    // Load the last active tab
    const savedActiveTab = localStorage.getItem("activeTab");
    if (savedActiveTab) {
        const savedTabButton = document.getElementById(savedActiveTab);
        if (savedTabButton) {
            savedTabButton.click();
        }
    }

    // Clear localStorage when submitting the form
    form.addEventListener("submit", function (event) {
        event.preventDefault(); // Prevent actual submission for demo purposes
        localStorage.clear();
        alert("Form submitted successfully!");
    });
});

</script>               
          