<!-- Layout config Js -->
<script src="https://trogon.info/codeace/html/src/assets/js/layout.js"></script>
<!-- Bootstrap Css -->
<link href="https://trogon.info/codeace/html/src/assets/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
<!-- Icons Css -->
<link href="https://trogon.info/codeace/html/src/assets/css/icons.min.css" rel="stylesheet" type="text/css" />
<!-- App Css-->
<link href="https://trogon.info/codeace/html/src/assets/css/app.min.css" rel="stylesheet" type="text/css" />
<!-- custom Css-->
<link href="https://trogon.info/codeace/html/src/assets/css/custom.min.css" rel="stylesheet" type="text/css" />



<style>

    .custom-nav .progress-label {
        font-size: 14px; /* Adjust font size */
        color: #6c757d; /* Optional: Customize label color */
        font-weight: 500; /* Optional: Add some weight to the labels */
    }
    button.btn{
        min-width: 80px;
    }
    /* Custom CSS to prevent color change on accordion header */
    .accordion-button {
        background-color: #fff; /* Set the background color */
        color: #000; /* Set the text color */
    }
    .accordion-button:not(.collapsed) {
        background-color: #fff; /* Keep the background color when expanded */
        color: #000; /* Keep the text color when expanded */
    }
    .accordion-button:focus {
        box-shadow: none; /* Remove the focus shadow */
    }
    .accordion-button:hover {
        background-color: #fff; /* Keep the background color on hover */
        color: #000; /* Keep the text color on hover */
    }
    /* Custom CSS for the accordion icon */
    .accordion-button .accordion-icon {
        margin-left: auto; /* Align the icon to the right */
        font-size: 1.5rem; /* Increase the icon size */
        color: #007bff; /* Highlight the icon color */
    }

    .accordion-button:not(.collapsed) .accordion-icon i {
        transform: rotate(180deg); /* Rotate the icon when expanded */
    }
    .btn-label.right {
        padding-left: 1px;
         padding-right: 1px; 
    }
    
</style>

<script>
    $(document).ready(function () {
    
        $('.select2').select2({
        
        });
    });
</script>

<!-- Start page title -->
<div class="row mb-3">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/cohorts/index')?>">Cohort</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>
        </div>
    </div>
</div>
<!-- end page title -->

<div class="row" id="cohortEdit">
    <div class="col-xl-12">
        <div class="card">
            <div class="card-header d-none">
                <h4 class="card-title mb-0">Progress Nav Steps</h4>
            </div><!-- end card header -->
            <div class="card-body">
                
                <ul class="nav nav-pills progress-bar-tab custom-nav d-flex justify-content-between align-items-center mb-3" role="tablist">
                    <?php if(is_admin()){?>
                        <li class="nav-item d-flex align-items-center" role="presentation">
                            <button class="nav-link rounded-pill active" data-progressbar="custom-progress-bar" id="pills-basic-info-tab" data-bs-toggle="pill" data-bs-target="#pills-basic-info" type="button" role="tab" aria-controls="pills-basic-info" aria-selected="true">1</button>
                            <span class="progress-label ms-2">Basic Info</span>
                        </li>
                        <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-learners-info-tab" data-bs-toggle="pill" data-bs-target="#pills-learners-info" type="button" role="tab" aria-controls="pills-learners-info" aria-selected="false">2</button>
                        <span class="progress-label ms-2">Learners</span>
                        </li>
                        <li class="nav-item d-flex align-items-center" role="presentation">
                            <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-live-sessions-info-tab" data-bs-toggle="pill" data-bs-target="#pills-live-sessions-info" type="button" role="tab" aria-controls="pills-live-sessions-info" aria-selected="false">3</button>
                            <span class="progress-label ms-2">Live Sessions</span>
                        </li>
                        <li class="nav-item d-flex align-items-center" role="presentation">
                            <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-activities-info-tab" data-bs-toggle="pill" data-bs-target="#pills-activities-info" type="button" role="tab" aria-controls="pills-activities-info" aria-selected="false" onclick="initAssignmentsScripts()">4</button>
                            <span class="progress-label ms-2">Activities/Assignments</span>
                        </li>
                        <li class="nav-item d-flex align-items-center" role="presentation">
                            <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-announcements-info-tab" data-bs-toggle="pill" data-bs-target="#pills-announcements-info" type="button" role="tab" aria-controls="pills-announcements-info" aria-selected="false">5</button>
                            <span class="progress-label ms-2">Announcements</span>
                        </li>
                    <?php }else if(is_instructor()){?>
        
                    <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill active" data-progressbar="custom-progress-bar" id="pills-learners-info-tab" data-bs-toggle="pill" data-bs-target="#pills-learners-info" type="button" role="tab" aria-controls="pills-learners-info" aria-selected="false">1</button>
                        <span class="progress-label ms-2">Learners</span>
                    </li>
                    <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-live-sessions-info-tab" data-bs-toggle="pill" data-bs-target="#pills-live-sessions-info" type="button" role="tab" aria-controls="pills-live-sessions-info" aria-selected="false">2</button>
                        <span class="progress-label ms-2">Live Sessions</span>
                    </li>
                    <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-activities-info-tab" data-bs-toggle="pill" data-bs-target="#pills-activities-info" type="button" role="tab" aria-controls="pills-activities-info" aria-selected="false" onclick="initAssignmentsScripts()">3</button>
                        <span class="progress-label ms-2">Activities/Assignments</span>
                    </li>
                    <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-announcements-info-tab" data-bs-toggle="pill" data-bs-target="#pills-announcements-info" type="button" role="tab" aria-controls="pills-announcements-info" aria-selected="false">4</button>
                        <span class="progress-label ms-2">Announcements</span>
                    </li>
                    <?php }?>
                </ul>


                <div class="tab-content">
                   
                <?php if(is_admin()){ ?>
                    <div class="tab-pane fade show active" id="pills-basic-info" role="tabpanel" aria-labelledby="pills-basic-info-tab">
                       
                        
                        
                        
                            <h4>Basic Info</h4>
                            <?= $this->include('Admin/Cohorts/ajax_add');?>
                
                    </div>
                    <!-- end tab pane -->
                     <?php }?>
                    <div class="tab-pane fade <?php echo is_admin() ? '' : 'show active'; ?>" id="pills-learners-info" role="tabpanel" aria-labelledby="pills-learners-info-tab">
                        <!-- <form action="<?= base_url('admin/Cohorts/add_cohort_students') ?>" id="addCohortLearnersForm"  method="post" enctype="multipart/form-data" class="<?php echo is_admin() ? '' : 'd-none'; ?>">
                            
                            <input type="hidden" id="cohort_id" name="cohort_id" value="<?= $edit_data['id'] ?>">
                            
                            <div class="col-lg-8">
                                <div class="mb-3">
                                    <label class="form-label" for="student_ids">Choose Learners<span class="required text-danger">*</span></label>
                                    <select class="form-select select2 shadow-none" multiple   name="student_id[]" id="student_ids" required>
                                        <option value="" disabled>Select Learners</option>
                                        <?php foreach ($learners as $learner): ?>
                                            <option value="<?=$learner['user_id']?>"><?=$learner['name']?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                            </div>
                            <div class="d-flex align-items-start gap-3 mt-4">
                                <button type="button" id="learnersSubmitBtn" class="btn btn-success btn-label right ms-auto nexttab">Save</button>
                            </div>
                        </form> -->
                        <!--table to view learners-->
                        <div class="card">
                            <div class="card-body">
                                <!-- <h5 class="card-title">Learners List</h5> -->
                                <!-- Swiper -->
                                <!-- <div class="row">
                                    <div class="col-lg-12">
                                        <div class="table-responsive" id="learnersTable">
                                            <table class="table table-borderless align-middle mb-0">
                                                <thead class="table-light">
                                                    <tr>
                                                        <th scope="col">Student ID</th>
                                                        <th scope="col">Name</th>
                                                        <th scope="col">Email</th>
                                                        <th scope="col" class="<?php echo is_admin() ? '' : 'd-none'; ?>">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <?php if(!empty($students)): ?>
                                                    <?php foreach ($students as $index => $student): ?>
                                                        <tr>
                                                            <td><?= $student['student_id'] ?? '' ?></td>
                                                            <td><?= $student['name'] ?? '' ?></td>
                                                            <td><?= $student['email'] ?? '' ?></td>
                                                            <td class="action <?php echo is_admin() ? '' : 'd-none'; ?>">
                                                                <ul class="list-inline hstack gap-2 mb-0">
                                                                    <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Remove">
                                                                        <a href="javascript:void(0)" class="link-danger fs-15 learnersDeleteBtn" data-id="<?= $student['id'] ?>" data-cohort-id="<?= $student['cohort_id'] ?>"><i class="ri-delete-bin-line"></i></a>
                                                                    </li>
                                                                </ul>
                                                            </td>
                                                        </tr>
                                                    <?php endforeach; ?>
                                                    <?php endif; ?>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div> -->

                                <div class="row align-items-center justify-content-between mb-3">
                                    <div class="col-md-3">
                                        <h5 class="card-title">Learners List</h5>
                                            <button type="button" id="learnersSubmitBtn" class="btn btn-sm btn-primary rounded-pill float-start" onclick="show_ajax_modal('<?=base_url('admin/Cohorts/ajax_add_learner/'.$edit_data['subject_id'].'/'.$edit_data['id'])?>', 'Add Learner')">
                                            <i class="mdi mdi-plus"></i> Add</button>
                                        </button>
                                    </div>
                                    <div class="col-md-9 text-end float-end" style="right: 0; width: 20%;">
                                        <input type="search" class="form-control" id="studentSearch" placeholder="Search Learners" >
                                    </div>
                                </div>
                                        

                                <!-- Swiper -->
                                <div class="row">
                                    <div class="col-lg-12">
                                        <div class="card border-0 shadow-sm" id="learnersTable">
                                            <div class="card-body p-3">

                                                <div class="row fw-semibold text-muted border-bottom pb-2 small">
                                                    <div class="col-6 col-md-4">No</div>
                                                    <!-- <div class="col-6 col-md-4">Classmates</div> -->
                                                </div>
                                                

                                                <div class="row mt-2 small">
                                                    <?php 
                                                    if (!empty($students)): 
                                                        $chunks = array_chunk($students, ceil(count($students) / 3)); // Split into 3 columns
                                                        $count = 1;
                                                        foreach ($chunks as $chunk): ?>
                                                            <div class="col-12 col-md-4 student-column">
                                                                <?php foreach ($chunk as $student): ?>
                                                                    <div class="d-flex align-items-center py-1 border-bottom student-item">
                                                                        <span class="me-2 text-muted fs-12"><?= $count++ ?></span>
                                                                        <img src="<?= !empty($student['profile_picture']) ? base_url(get_file($student['profile_picture'])) : base_url('assets/admin/images/place-holder/profile-place-holder.jpg') ?>" 
                                                                            class="rounded-circle me-2" width="40" height="40" alt="student">
                                                                        <span id="learnerName" class="student-name"><?= esc($student['name'] ?? 'Unknown') ?></span>

                                                                        <?php if (is_admin()): ?>
                                                                            <a href="javascript:void(0)" 
                                                                            class="ms-auto text-danger fs-15 learnersDeleteBtn" 
                                                                            data-id="<?= $student['id'] ?>" 
                                                                            data-cohort-id="<?= $student['cohort_id'] ?>"
                                                                            data-bs-toggle="tooltip" 
                                                                            title="Remove">
                                                                                <i class="ri-delete-bin-line"></i>
                                                                            </a>
                                                                        <?php endif; ?>
                                                                    </div>
                                                                <?php endforeach; ?>
                                                            </div>
                                                        <?php endforeach; 
                                                    endif;
                                                    ?>
                                                </div>

                                            </div>
                                        </div>

                                    </div>
                                </div>
                                <!-- End Swiper -->
                            </div>
                        <!-- end card body -->
                        </div><!-- end card -->
                    </div>
                     <!-- end tab pane -->
                     
                    <div class="tab-pane fade" id="pills-live-sessions-info" role="tabpanel" aria-labelledby="pills-live-sessions-info-tab">
                       
                        <?= $this->include('Admin/Live_class/live_cohort_index'); ?>
                        
                    </div>
                    <!-- end tab pane -->

                    <div class="tab-pane fade" id="pills-activities-info" role="tabpanel" aria-labelledby="pills-activities-info-tab">
                        
                        <?= $this->include('Admin/Assignment/cohort_assignments_index'); ?>

                    </div>
                    <!-- end tab pane -->
                    
                    <div class="tab-pane fade" id="pills-announcements-info" role="tabpanel" aria-labelledby="pills-announcements-info-tab">
                        
                        <?= $this->include('Admin/Announcement/cohort_announcement_index'); ?>

                    </div>
                    <!-- end tab pane -->
                </div>
                <!-- end tab content -->
            </div>
            <!-- end card body -->
        </div>
        <!-- end card -->
    </div>
    <!-- end col -->
</div>
<!-- end row -->


<script>
   
    $(document).ready(function () {

        // basic add
        $("#basicSubmitBtn").on("click", function (e) {
            e.preventDefault();
            
            var form = document.getElementById("addCohortBasicForm");
            
            var routeUrl = form.action
            
            ajax(form,routeUrl,$("#pills-learners-info-tab"));
            
        });
        
        // learners add
        $("#learnersSubmitBtn").on("click", function (e) {
            e.preventDefault();
           
            var form = document.getElementById("addCohortLearnersForm");
            
            var routeUrl = "<?=base_url('admin/Cohorts/add_cohort_students')?>";
            
            var reload = "#learnersTable"
            
            ajax(form,routeUrl,$("#pills-live-sessions-info-tab"),reload);
            
        });
        
        // learners delete
        $(document).on("click", ".learnersDeleteBtn", function (e) {
            e.preventDefault();
           
            const id = $(this).data("id");
            const cohortId = $(this).data("cohort-id");
        
            Swal.fire({
                icon: "warning",
                title: "Are you sure?",
                text: "This action cannot be undone!",
                showCancelButton: true,
                confirmButtonText: "Yes, delete it!",
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: "<?= base_url('admin/cohorts/delete_cohort_student') ?>",
                        type: "POST",
                        data: {
                            id: id,
                            cohort_id: cohortId
                        },
                        dataType: "json",
                        success: function (response) {
                            if (response.success) {
                                Swal.fire({
                                    icon: "success",
                                    title: "Deleted!",
                                    text: response.message,
                                    timer: 2000,
                                    showConfirmButton: false
                                }).then(() => {
                                    $("#learnersTable").load(location.href + " #learnersTable > *");
                                    $("#learnersDropdown").load(location.href + " #learnersDropdown > *");
                                });
                            } else {
                                Swal.fire({
                                    icon: "error",
                                    title: "Error!",
                                    text: response.message || "Something went wrong!",
                                });
                            }
                        },
                        error: function () {
                            Swal.fire({
                                icon: "error",
                                title: "Error!",
                                text: "Failed to submit data. Please try again.",
                            });
                        }
                    });
                }
            });
            
        });

        // announcements add
        $("#announcementsSubmitBtn").on("click", function (e) {
            e.preventDefault();
            
            var form = document.getElementById("announcementsAddForm");
            
            var routeUrl = "<?=base_url('admin/Cohorts/add_cohort_announcements')?>";
            
            var navigate = "<?=base_url('admin/Cohorts/index')?>";
            
            ajax(form,routeUrl,navigate,navigate);
            
        });
        
        function ajax(form,routeUrl,triggerId,reload) {
            var formData = new FormData(form);
            $.ajax({
                url: routeUrl, 
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                dataType: "json",
                success: function (response) {
                    if (response.success) { 
                        Swal.fire({
                            icon: "success",
                            title: "Success!",
                            text: response.message,
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            form.reset(); 
                            $(form).find("select").val(null).trigger("change");
                            $(reload).load(location.href + " " + reload + " > *");
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: response.message || "Something went wrong!",
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text: "Failed to submit data. Please try again.",
                    });
                }
            });  
        }
        
        function resetForm() {
            $("#addCohortLearnersForm")[0].reset();
            $("#student_ids").val(null).trigger("change"); 
        }
    
    });
    
</script>
<script>
    document.addEventListener("DOMContentLoaded", function() {
        const searchInput = document.getElementById("studentSearch");
        const students = document.querySelectorAll(".student-item");

        searchInput.addEventListener("input", function() {
            const term = this.value.toLowerCase();

            students.forEach(student => {
                const name = student.querySelector(".student-name").textContent.toLowerCase();
                const match = name.includes(term);
                if (match) {
                student.classList.remove('d-none');
                } else {
                student.classList.add('d-none');
                }
            });
        });

        searchInput.addEventListener('search', function () {
            // Clear input (browser already does this)
            students.forEach(item => item.classList.remove('d-none')); // show all again
        });
    });
</script>
<script>
function initAssignmentsScripts() {
  // Load assignment details
  $(document).off('click', '.assignment-item').on('click', '.assignment-item', function () {
    $('.assignment-item').removeClass('active');
    $(this).addClass('active');

    const assignmentId = $(this).data('id');

    $.ajax({
      url: '<?= base_url("admin/Cohorts/ajax_assignment_details") ?>',
      type: 'POST',
      data: { id: assignmentId },
      dataType: 'json',
      success: function (data) {
        $('#assignmentTitle').text(data.title);
        $('#assignmentMeta').text(`Cohort: ${data.cohort}`);
        $('#assignmentDeadline').html(`<strong>Deadline: ${data.due_date} (${data.to_time})</strong>`);
        $('#assignmentTotalMarks').html(`<strong>Total Marks: ${data.total_marks}</strong>`);
        $('#assignmentQuestion').html(`<strong>Question File: <a href="${data.file}" target="_blank">Download</a></strong>`);
        $('#assignmentDetails').html(`
          <h6 class="fw-semibold text-uppercase text-secondary mb-2">Instructions</h6>
          <div class="text-muted">${data.instructions}</div>
        `);
        $('#submissionContainer').html('Click on “Submissions” to load data.');
        $('#submissionContainer').removeData('loaded');
      }
    });
  });

  //  Tab switching
  $(document).off('click', '.nav-link[data-tab]').on('click', '.nav-link[data-tab]', function (e) {
    e.preventDefault();
    const tab = $(this).data('tab');
    $('.nav-link').removeClass('active');
    $(this).addClass('active');
    $('.tab-pane').removeClass('active');
    if (tab === 'details') $('#detailsTab').addClass('active');
    else $('#submissionsTab').addClass('active');
    
  });

  //  Load submissions


    $(document).off('click', '.nav-link[data-tab]').on('click', '.nav-link[data-tab]', function (e) {
    e.preventDefault();

    const assignmentId = $('.assignment-item.active').data('id');
    if (!assignmentId) return;
    const tab = $(this).data('tab');

    // Highlight the clicked tab
    $('.nav-link[data-tab]').removeClass('active');
    $(this).addClass('active');

    // Show relevant tab-pane
    if (tab === 'details') {
        $('#detailsTab').addClass('active').show();
        $('#submissionsTab').removeClass('active').hide();
        $('#unsubmissionsTab').removeClass('active').hide();
    } else if (tab === 'submissions') {
        $('#submissionsTab').addClass('active').show();
        $('#detailsTab').removeClass('active').hide();
        $('#unsubmissionsTab').removeClass('active').hide();
    } else if (tab === 'unsubmissions') {
        $('#unsubmissionsTab').addClass('active').show();
        $('#submissionsTab').removeClass('active').hide();
        $('#detailsTab').removeClass('active').hide();
    }

    $.ajax({
        url: '<?= base_url("admin/Cohorts/ajax_show_submissions") ?>',
        type: 'POST',
        data: { assignment_id: assignmentId },
        success: function (html) {
            $('#submissionContainer').html(html);
            $('#submissionContainer').data('loaded', true);
        },
        error: function () {
            $('#submissionContainer').html('<p class="text-danger">Failed to load submissions.</p>');
        }
        });


    $.ajax({
        url: '<?= base_url("admin/Cohorts/ajax_show_unsubmissions") ?>',
        type: 'POST',
        data: { assignment_id: assignmentId },
        success: function (html) {
            $('#unsubmissionContainer').html(html);
            $('#unsubmissionContainer').data('loaded', true);
        },
        error: function () {
            $('#unsubmissionContainer').html('<p class="text-danger">Failed to load submissions.</p>');
        }
        });


    });
}
</script>



