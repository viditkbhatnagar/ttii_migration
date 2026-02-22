<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row align-items-center">
                    <div class="col-1">
                        <h5 class="card-title mb-0">Live Sessions</h5>
                    </div>
                    <div class="col-2">
                        <button class="btn btn-sm btn-primary rounded-pill float-start"
                                onclick="show_ajax_modal('<?= base_url('centre/Cohorts/add_live_class/' . $edit_data['id']) ?>', 'Add Live Session')">
                            <i class="mdi mdi-plus"></i>
                            Add Live Session
                        </button>
                    </div>
                    <div class="col-9">
                        <div class="d-flex align-items-center float-end">
                            <div class="btn-group" role="group">
                                <button type="button" class="btn btn-outline-secondary" id="cardViewBtn" onclick="switchView('card')">
                                    <i class="ri-layout-grid-line"></i>
                                </button>
                                <button type="button" class="btn btn-outline-secondary active" id="listViewBtn" onclick="switchView('list')">
                                    <i class="ri-list-check"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<!--end row-->

<!-- <?=get_user_id()?> -->

<div class="container-fluid p-4">

    <!-- Card View -->
    <div id="cardView" style="display: none;">
        <div class="row">
            <?php
            if (isset($live_class)){
                foreach ($live_class as $key => $list_item){
                    ?>
                    <div class="col-md-6 col-xxl-4 mb-4">
                        <div class="card card-animate rounded-4 border">
                            <div class="card-body p-4">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="avatar-sm flex-shrink-0">
                                        <span class="avatar-title bg-light text-primary rounded-2 fs-2">
                                            <i class="ri-live-line"></i>
                                        </span>
                                    </div>
                                    <div class="flex-grow-1 overflow-hidden ms-3">
                                        <p class="text-uppercase fw-bold text-primary mb-0"><?=$list_item['title']?></p>
                                    </div>
                                    <?php
                                        $status = $list_item['status'];
                                        switch ($status) {
                                            case 'upcoming':
                                                $badgeClass = 'bg-success-subtle text-success';
                                                break;
                                            case 'ongoing':
                                                $badgeClass = 'bg-warning-subtle text-warning';
                                                break;
                                            case 'expired':
                                                $badgeClass = 'bg-danger-subtle text-danger';
                                                break;
                                            default:
                                                $badgeClass = 'bg-success-subtle text-success';
                                                break;
                                        }
                                    ?>
                                    <div>
                                        <span class="badge <?=$badgeClass?> ms-2" style="font-size: 0.7rem;">
                                            <?= ucfirst($status) ?>
                                        </span>
                                    </div>
                                </div>
                                <div class="custom-details-card">
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="detail-item mb-2">
                                                <h6 class="fw-bold mb-1">Session ID</h6>
                                                <p class="text-muted m-0"><?=$list_item['session_id']?></p>
                                            </div>
                                            <div class="detail-item mb-2">
                                                <h6 class="fw-bold mb-1">Zoom ID</h6>
                                                <p class="text-muted m-0"><?=$list_item['zoom_id']?></p>
                                            </div>
                                            <div class="detail-item mb-2">
                                                <h6 class="fw-bold mb-1">Password</h6>
                                                <p class="text-muted m-0"><?=$list_item['password']?></p>
                                            </div>
                                            <div class="detail-item mb-2">
                                                <h6 class="fw-bold mb-1">Cohort</h6>
                                                <span class="badge bg-dark-subtle text-muted" style="font-size: 0.7rem;">
                                                    <?= $edit_data['title'] ?? 'Not Mentioned' ?>
                                                </span>
                                            </div>
                                        </div>
                                        <div class="col-6">
                                            <div class="detail-item mb-2">
                                                <h6 class="fw-bold mb-1">Time</h6>
                                                <p class="text-muted m-0"><?= date('h:i A', strtotime($list_item['fromTime'])) ?> To: <?= date('h:i A', strtotime($list_item['toTime'])) ?></p>
                                            </div>
                                            <div class="detail-item mb-2">
                                                <h6 class="fw-bold mb-1">Date</h6>
                                                <p class="text-muted m-0"><?= date('d-m-Y', strtotime($list_item['date'])) ?></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>               
                                <div class="d-flex justify-content-end">
                                    <?php if (!empty($list_item['video_url'])) { ?>
                                    <button class="btn btn-outline-warning custom-rounded-40px-srs py-1 px-3 me-2"
                                            onclick="show_ajax_modal('<?= base_url('centre/Cohorts/add_vimeo_link/' . $list_item['id']) ?>', 'Edit Recorded link')">
                                        <i class="ri-edit-line"></i> Edit Recorded link
                                    </button>
                                    <?php } else { ?>
                                    <button class="btn btn-success custom-rounded-40px-srs py-1 px-3 me-2"
                                            onclick="show_ajax_modal('<?= base_url('centre/Cohorts/add_vimeo_link/' . $list_item['id']) ?>', 'Add Recorded link')">
                                        <i class="mdi mdi-plus"></i> Add Recorded link
                                    </button>
                                    <?php } ?>
                                    <a href="<?=base_url('zoom/index/'.$list_item['id'].'/'.$list_item['cohort_id'])?>" class="btn btn-info me-2 custom-rounded-40px-srs py-1 px-3">
                                        <i class="ri-video-chat-line"></i> Host
                                    </a>
                                    
                                    <button class="btn btn-outline-danger custom-rounded-40px-srs py-1 px-3" type="button" data-id="<?= $list_item['id'] ?>" data-cohort-id="<?= $list_item['cohort_id'] ?>">
                                        <i class="ri-delete-bin-fill fs-6"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <?php
                }
            }
            ?>
        </div>
    </div>

    <!-- List View -->
    <div id="listView">
        <?php
        if (isset($live_class)){
            // Group by status
            $grouped = [
                'upcoming' => [],
                'completed' => []
            ];
            
            foreach ($live_class as $key => $list_item){

                 if ($list_item['date'] < date('Y-m-d')) {
                    $list_item['status'] = 'expired';
                } else if ($list_item['date'] == date('Y-m-d') && $list_item['fromTime'] <= date('H:i') && $list_item['toTime'] >= date('H:i')) {
                    $list_item['status'] = 'ongoing';
                } else {
                    $list_item['status'] = 'upcoming';
                }


                if ($list_item['status'] === 'expired') {
                    $grouped['completed'][] = $list_item;
                } else {
                    $grouped['upcoming'][] = $list_item;
                }
            }
            
            // Display Upcoming
            if (!empty($grouped['upcoming'])) {
                ?>
                <div class="mb-4">
                    <h6 class="text-muted text-uppercase mb-3">Upcoming & Ongoing</h6><hr class="dropdown-divider">
                    <?php foreach ($grouped['upcoming'] as $list_item) { ?>
                        <div class="card border mb-3 rounded-3 hover-shadow">
                            <div class="card-body p-3">
                                <div class="d-flex align-items-center">
                                    <div class="flex-shrink-0">
                                        <div class="rounded-3 overflow-hidden" style="width: 100px; height: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                            <div class="d-flex align-items-center justify-content-center h-100">
                                                <i class="ri-live-line text-white fs-2"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1 ms-3">
                                        <p class="mb-1 fw-bold"><?=$list_item['title']?></p>
                                        <p class="text-muted mb-0 small">
                                            <?= date('Y-m-d', strtotime($list_item['date'])) ?>, 
                                            <?= date('l', strtotime($list_item['date'])) ?>, 
                                            <?= date('h:i A', strtotime($list_item['fromTime'])).' - '.date('h:i A', strtotime($list_item['toTime'])) ?>
                                        </p>
                                    </div>
                                    
                                    <?php if(!empty($list_item['video_url'])) { ?>
                                    <div class="flex-shrink-0 me-3">
                                        <span class="badge bg-success-subtle text-success">
                                            <i class="ri-upload-line me-1"></i> Uploaded
                                        </span>
                                    </div>
                                    <?php } ?>
                                    <div class="flex-grow-3">
                                       <button class="btn btn-light btn-sm ">
                                                    <a class="dropdown-item" href="<?=base_url('zoom/index/'.$list_item['id'].'/'.$list_item['cohort_id'])?>">
                                                        <i class="ri-video-chat-line me-2"></i> Host
                                                    </a>
                                        </button>
                                        <button class="btn btn-light btn-sm ">
                                            <a class="dropdown-item" href="<?=$list_item['video_url']?>" target="_blank">
                                                <i class="ri-eye-line me-2"></i> View Recording
                                            </a>
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm ">
                                             <a class="dropdown-item" href="#" onclick="show_ajax_modal('<?= base_url('centre/Cohorts/add_vimeo_link/' . $list_item['id']) ?>', 'Edit Recorded link')">
                                                <i class="ri-edit-line me-2"></i> Edit Link
                                            </a>
                                        </button>

                                        <button class="btn btn-outline-danger custom-rounded-40px-srs py-1 px-3" type="button" id="liveClassDeleteBtn" data-id="<?= $list_item['id'] ?>" data-cohort-id="<?= $list_item['cohort_id'] ?>">
                                            <i class="ri-delete-bin-fill fs-6"></i> Delete
                                        </button>

                                    </div>
                                    <!-- <div class="flex-shrink-0 ">
                                        <div class="dropdown">
                                            <button class="btn btn-light btn-sm" type="button" data-bs-toggle="dropdown">
                                                <i class="ri-more-2-fill"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <a class="dropdown-item" href="<?=base_url('zoom/index/'.$list_item['id'].'/'.$list_item['cohort_id'])?>">
                                                        <i class="ri-video-chat-line me-2"></i> Host
                                                    </a>
                                                </li>
                                                <li>
                                                    <a class="dropdown-item" href="#" onclick="show_ajax_modal('<?= base_url('centre/Cohorts/add_vimeo_link/' . $list_item['id']) ?>', 'Add Recorded link')">
                                                        <i class="mdi mdi-plus me-2"></i> Add Recorded link
                                                    </a>
                                                </li>
                                                <li><hr class="dropdown-divider"></li>
                                                <li>
                                                    <a class="dropdown-item text-danger" href="#" data-id="<?= $list_item['id'] ?>" data-cohort-id="<?= $list_item['cohort_id'] ?>">
                                                        <i class="ri-delete-bin-fill me-2"></i> Delete
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div> -->
                                </div>
                            </div>
                        </div>
                    <?php } ?>
                </div>
                <?php
            }
            
            // Display Completed
            if (!empty($grouped['completed'])) {
                ?>
                <div class="mb-4">
                    <h6 class="text-muted text-uppercase mb-3">Completed</h6><hr class="dropdown-divider">
                    <?php foreach ($grouped['completed'] as $list_item) { ?>
                        <div class="card border mb-3 rounded-3 hover-shadow" style="opacity: 0.8;">
                            <div class="card-body p-3">
                                <div class="d-flex align-items-center">
                                    <div class="flex-shrink-0">
                                        <div class="rounded-3 overflow-hidden" style="width: 100px; height: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                            <div class="d-flex align-items-center justify-content-center h-100">
                                                <i class="ri-live-line text-white fs-2"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1 ms-3 ">
                                        <p class="mb-1 fw-bold"><?=$list_item['title']?></p>
                                        <p class="text-muted mb-0 small">
                                            <?= date('Y-m-d', strtotime($list_item['date'])) ?>, 
                                            <?= date('l', strtotime($list_item['date'])) ?>, 
                                            <?= date('h:i A', strtotime($list_item['fromTime'])).' - '.date('h:i A', strtotime($list_item['toTime'])) ?>
                                        </p>
                                    </div>
                                    <?php if(!empty($list_item['video_url'])) { ?>
                                    <div class="flex-shrink-0 me-3">
                                        <span class="badge bg-success-subtle text-success">
                                            <i class="ri-upload-line me-1"></i> Uploaded
                                        </span>
                                    </div>
                                    <?php } ?>
                                    <div class="flex-grow-3">
                                        <button class="btn btn-light btn-sm ">
                                            <a class="dropdown-item" href="<?=$list_item['video_url']?>" target="_blank">
                                                <i class="ri-eye-line me-2"></i> View Recording
                                            </a>
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm ">
                                             <a class="dropdown-item" href="#" onclick="show_ajax_modal('<?= base_url('centre/Cohorts/add_vimeo_link/' . $list_item['id']) ?>', 'Edit Recorded link')">
                                                <i class="ri-edit-line me-2"></i> Edit Link
                                            </a>
                                        </button>

                                        <button class="btn btn-outline-danger custom-rounded-40px-srs py-1 px-3" type="button" id="liveClassDeleteBtn" data-id="<?= $list_item['id'] ?>" data-cohort-id="<?= $list_item['cohort_id'] ?>">
                                            <i class="ri-delete-bin-fill fs-6"></i> Delete
                                        </button>

                                    </div>
                                    <!-- <div class="flex-shrink-0">
                                        <div class="dropdown">
                                            <button class="btn btn-light btn-sm " type="button" data-bs-toggle="dropdown">
                                                <i class="ri-more-2-fill"></i>
                                            </button>

                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <a class="dropdown-item" href="#">
                                                        <i class="ri-eye-line me-2"></i> View Recording
                                                    </a>
                                                </li>
                                                <li>
                                                    <a class="dropdown-item" href="#" onclick="show_ajax_modal('<?= base_url('centre/Cohorts/add_vimeo_link/' . $list_item['id']) ?>', 'Edit Recorded link')">
                                                        <i class="ri-edit-line me-2"></i> Edit Link
                                                    </a>
                                                </li>
                                                <li><hr class="dropdown-divider"></li>
                                                <li>
                                                    <a class="dropdown-item text-danger" href="#" data-id="<?= $list_item['id'] ?>" data-cohort-id="<?= $list_item['cohort_id'] ?>">
                                                        <i class="ri-delete-bin-fill me-2"></i> Delete
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div> -->
                                </div>
                            </div>
                        </div>
                    <?php } ?>
                </div>
                <?php
            }
        }
        ?>
    </div>
</div>

<style>
.hover-shadow {
    transition: all 0.3s ease;
}

.hover-shadow:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
}

.card-animate {
    transition: all 0.3s ease;
}

.card-animate:hover {
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.custom-rounded-40px-srs {
    border-radius: 40px;
}
</style>

<script>
function switchView(view) {
    const cardView = document.getElementById('cardView');
    const listView = document.getElementById('listView');
    const cardBtn = document.getElementById('cardViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    
    if (view === 'card') {
        cardView.style.display = 'block';
        listView.style.display = 'none';
        cardBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        cardView.style.display = 'none';
        listView.style.display = 'block';
        cardBtn.classList.remove('active');
        listBtn.classList.add('active');
    }
}

// Initialize with list view
document.addEventListener('DOMContentLoaded', function() {
    switchView('list');
});
</script>





<script>
    // $("#liveClassDeleteBtn").on("click", function (e) {
    $(document).on("click", "#liveClassDeleteBtn", function (e) {
        e.preventDefault();
        console.log(10)
        const liveClassId = $(this).data("id");
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
                    url: "<?= base_url('centre/live_class/delete') ?>",
                    type: "POST",
                    data: { id: liveClassId },
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
                                
                                const reload = '#pills-live-sessions-info';
                                $.get("<?= base_url('centre/Cohorts/cohort_edit/') ?>" + cohortId, function (data) {
                                    let html = $('<div>').html(data);
                                    let newContent = html.find(reload).html();
                                    $(reload).html(newContent);
                                    $('html, body').animate({
                                        scrollTop: $('#pills-live-sessions-info').offset().top - 100
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