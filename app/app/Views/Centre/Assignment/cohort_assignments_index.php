  <style>

    .assignments-container {
      display: flex;
      gap: 1.5rem;
    }

    /* Sidebar */
    .assignment-sidebar {
      width: 28%;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 0 5px rgba(0,0,0,0.05);
      padding: 1rem;
      height: 500px;
      overflow-y: auto;
    }

    .assignment-sidebar h6 {
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .assignment-item {
      border: 1px solid #d3d0ff;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .assignment-item:hover, .assignment-item.active {
      background-color: #f3f1ff;
      border-color: #7367f0;
    }

    .assignment-item small {
      color: #777;
    }

    .btn-add {
      background-color: #7367f0;
      color: #fff;
      font-weight: 500;
      border-radius: 30px;
      padding: 6px 16px;
    }

    .status-tabs .btn {
      border-radius: 30px;
      font-weight: 500;
    }

    .status-tabs .btn.active {
      background-color: #7367f0;
      color: #fff;
    }

    /* Right Panel */
    .assignment-details {
      flex: 1;
      background: #fff;
      border-radius: 12px;
      border: 1px solid #d3d0ff;
      padding: 1.5rem;
      box-shadow: 0 0 5px rgba(0,0,0,0.05);
      overflow-y: auto;
    }

    .assignment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
      padding-bottom: 1rem;
      margin-bottom: 1rem;
    }

    .assignment-header h5 {
      font-weight: 600;
    }

    .nav-tabs {
      border-bottom: none;
    }

    .nav-tabs .nav-link {
      border: none;
      color: #555;
      border-radius: 30px;
      margin-right: 0.5rem;
      background-color: #f4f4f6;
    }

    .nav-tabs .nav-link.active {
      background-color: #7367f0;
      color: #fff;
    }

    .question-box {
      background: #faf9ff;
      border: 1px solid #d3d0ff;
      border-radius: 10px;
      padding: 1rem;
      margin-top: 1.5rem;
    }

    .question-box strong {
      color: #333;
    }
  </style>
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-1">
                        <h5 class="card-title mb-0">Assignments</h5>
                    </div>
                    <div class="col-4">
                        <button class="btn btn-md btn-primary rounded-pill float-start"
                                onclick="show_ajax_modal('<?=base_url('centre/Cohorts/assignments_add/' . $edit_data['id']) ?>', 'Add Assignment')">
                            <i class="mdi mdi-plus"></i>
                            Add
                        </button>
                    </div>
                </div>
            </div>
            <div class="row m-3 d-none">
                    <div class="status-tabs nav">
                        <button class="btn btn-sm btn-outline-secondary active me-2">Ongoing</button>
                        <button class="btn btn-sm btn-outline-secondary">Closed</button>
                    </div>
                </div>
            <div class="card-body">
                


                <div class="assignments-container">
                  <!-- Sidebar -->
                  <div class="assignment-sidebar">
                    <?php if(!empty($assignments)): ?>
                      <?php foreach($assignments as $a): ?>
                        <div class="assignment-item" data-id="<?= $a['id'] ?>">
                          <div class="fw-semibold"><?= esc($a['title']) ?></div>
                          <small>Description: <?= $a['description'] ?></small><br>
                          <button class="btn btn-sm btn-outline-primary rounded-pill mt-2" onclick="show_ajax_modal('<?=base_url('admin/Cohorts/assignments_edit/' . $a['id']) ?>', 'Edit Assignment')"><i class="mdi mdi-pencil"></i> Edit</button>
                          <div class="mt-2">
                            <!-- <button class="btn btn-sm btn-outline-primary rounded-pill">
                              </?= $a['submission_count'] ?> Submissions
                            </button> -->
                          </div>
                        </div>
                      <?php endforeach; ?>
                    <?php else: ?>
                      <p class="text-muted">No assignments found.</p>
                    <?php endif; ?>
                  </div>

                  <!-- Right Panel -->
                  <div class="assignment-details">
                    <div class="assignment-header">
                      <div>
                        <h5 id="assignmentTitle">Select an assignment</h5>
                        <small class="text-muted" id="assignmentMeta"></small>
                      </div>
                      <span>
                      <small class="text-muted" id="assignmentDeadline"></small><br>
                      <small class="text-muted" id="assignmentTotalMarks"></small>
                      </span>
                      <small class="text-muted" id="assignmentQuestion"></small>
                    </div>

                    <ul class="nav nav-tabs mb-3" id="assignmentTabs">
                      <li class="nav-item">
                        <a class="nav-link active" data-tab="details">Details</a>
                      </li>
                      <li class="nav-item">
                        <a class="nav-link" data-tab="submissions">Submissions</a>
                      </li>
                      <li class="nav-item">
                        <a class="nav-link" data-tab="unsubmissions">Unsubmitted Students</a>
                      </li>
                    </ul>


                    <div class="tab-content">
                      <div class="tab-pane active" id="detailsTab">
                        <div id="assignmentDetails">Select an assignment to view details.</div>
                      </div>
                      <div class="tab-pane" id="submissionsTab">
                        <div id="submissionContainer" class="text-center text-muted p-3">
                          Click on “Submissions” to load data.
                        </div>
                      </div>
                      <div class="tab-pane" id="unsubmissionsTab">
                        <div id="unsubmissionContainer" class="text-center text-muted p-3">
                          Click on “unSubmissions” to load data.
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

            </div>
        </div>
    </div>
</div><!--end row-->

<script>
    $(document).on("click", "#assignmentDeleteBtn", function (e) {
        e.preventDefault();
        console.log(10)
        const assignmentId = $(this).data("id");
        const cohortId = $(this).data("cohort-id");

        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: "<?= base_url('centre/assignment/delete') ?>",
                    type: "POST",
                    data: { id: assignmentId },
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
                                
                                const reload = '#pills-activities-info';
                                $.get("<?= base_url('centre/Cohorts/cohort_edit/') ?>" + cohortId, function (data) {
                                    let html = $('<div>').html(data);
                                    let newContent = html.find(reload).html();
                                    $(reload).html(newContent);
                                    $('html, body').animate({
                                        scrollTop: $('#pills-activities-info').offset().top - 100
                                    }, 800);
                                });
                                
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
                            text: "Failed to delete. Please try again.",
                        });
                    }
                });
            }
        });
    });
</script>



