<style>
    .stat-card {
        border-radius: 12px;
        padding: 20px;
        background: #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: 0.2s;
    }
    .stat-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }

    .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        margin-bottom: 10px;
    }

    .stat-value { font-size: 26px; font-weight: 700; }
    .stat-sub { font-size: 14px; color: #6c757d; }

    .table td, .table th { vertical-align: middle; }
</style>

<div class="container-fluid">
    <div class="row">
        <div class="sidebar-center-card nav-item">
            <h6 class="text-uppercase text-muted mb-2">Center Profile</h6>

            <div class="fw-bold fs-5 text-white">
                <?php 
                $data = get_centre_name();

                if (!empty($data)) {
                    echo $data['centre_name'];
                }
                ?>
            </div>

            <div class="mt-2 small text-info fw-semibold">
                ID: <?php if (!empty($data)) {
                    echo $data['centre_id'];
                } ?>
            </div>
        </div>
    </div>
</div>

<div class="container-fluid mt-4">

    <!-- ===== Top Statistics ===== -->
    <div class="row g-3 mb-4">

        <!-- Total Students -->
        <div class="col-md-3 col-6">
            <div class="stat-card text-center">
                <div class="stat-icon bg-primary-subtle text-primary">
                    <i class="ri-group-fill"></i>
                </div>
                <div class="stat-value"><?= $students ?? 0 ?></div>
                <div class="stat-sub text-success">--------</div>
                <!-- <div class="stat-sub text-success">+12% from last month</div> -->
                <div class="fw-bold mt-1">Total Students</div>
            </div>
        </div>

        <!-- Wallet Balance -->
        <div class="col-md-3 col-6">
            <div class="stat-card text-center">
                <div class="stat-icon bg-success-subtle text-success">
                    <i class="ri-wallet-3-fill"></i>
                </div>
                <div class="stat-value">₹ <?= $wallet_balance ?? 0 ?></div>
                <?php if ($wallet_balance <= 5000) { ?>
                <div class="stat-sub text-danger">Low Balance Alert</div>
                <div class="fw-bold mt-1">Wallet Balance</div>
                <?php } else { ?>
                <div class="stat-sub text-success">---------</div>
                <div class="fw-bold mt-1">Wallet Balance</div>
                <?php } ?>
            </div>
        </div>

        <!-- Active Cohorts -->
        <div class="col-md-3 col-6">
            <div class="stat-card text-center">
                <div class="stat-icon bg-info-subtle text-purple">
                    <i class="ri-graduation-cap-fill"></i>
                </div>
                <div class="stat-value"><?= $active_cohorts ?? 0 ?></div>
                <div class="stat-sub">&nbsp;</div>
                <div class="fw-bold mt-1">Active Cohorts</div>
            </div>
        </div>

        <!-- Pending Applications -->
        <div class="col-md-3 col-6">
            <div class="stat-card text-center">
                <div class="stat-icon bg-warning-subtle text-warning">
                    <i class="ri-user-add-fill"></i>
                </div>
                <div class="stat-value"><?= $pending_applications ?? 0 ?></div>
                <div class="stat-sub">&nbsp;</div>
                <div class="fw-bold mt-1">Pending Applications</div>
            </div>
        </div>
    </div>


    <div class="row g-4">

        <!-- ===== Recent Students ===== -->
        <div class="col-xl-10">
            <div class="card">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Recent Students</h5>
                    <a href="<?= base_url('centre/students') ?>" class="small text-primary">View All</a>
                </div>

                <div class="table-responsive">
                    <table class="table align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Student Name</th>
                                <th>Course</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recent_students as $enrollment): ?>
                                <tr>
                                    <td><?= $enrollment['student_name'] ?></td>
                                    <td><?= $enrollment['course_name'] ?? 'N/A' ?></td>
                                    <td><?= date('d M Y', strtotime($enrollment['enrollment_date'])) ?? 'N/A' ?></td>
                                    <td><span class="badge bg-success">Active</span></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>


        <!-- ===== Quick Actions + Upcoming Training ===== -->
        <div class="col-xl-2">
            <div class="card p-3 mb-4">
                <h6 class="fw-bold mb-3">Quick Actions</h6>

                <button class="btn btn-outline-primary w-100 mb-2" onclick="window.location.href='<?= base_url('centre/applications/add') ?>' ">
                    <i class="ri-user-add-line me-2"></i> Enroll New Student
                </button>

                <button class="btn btn-outline-success w-100 mb-2" onclick="window.location.href='<?= base_url('centre/wallet/index') ?>' ">
                    <i class="ri-wallet-2-line me-2"></i> Recharge Wallet
                </button>

                <!-- <button class="btn btn-outline-dark w-100 mb-2">
                    <i class="ri-download-2-line me-2"></i> Download Reports
                </button> -->
            </div>

            <!-- <div class="card p-3">
                <h6 class="fw-bold mb-3">Upcoming Training</h6>

                <div class="p-3 rounded bg-warning-subtle">
                    <h6 class="fw-bold">New Curriculum Workshop</h6>
                    <p class="small mb-2">Dec 05, 10:00 AM • Zoom</p>
                    <button class="btn btn-warning w-100">Register</button>
                </div>
            </div> -->
        </div>

    </div>

</div>
