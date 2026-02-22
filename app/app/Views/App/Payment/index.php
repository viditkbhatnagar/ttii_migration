<div class="container-fluid py-3">
  <div class="card shadow-lg p-4" >
    <h2 class="fw-bold h4 m-2">Payment History</h2>
    <div class="mb-4">
        <div class="table-responsive py-3">
              <table class="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                      <?php foreach ($payment as $row): ?>
                        <tr>
                          <td>
                            <div class="d-flex align-items-center">
                                <div>
                                    <i class="ri-book-2-line fs-5 text-primary me-2"></i>
                                </div>
                              <span><?= esc($row['title']) ?></span>
                            </div>
                          </td>
                          <td><?= esc(date('d M Y', strtotime($row['event_date']))) ?></td>
                          <td><?= esc(date('h:i A', strtotime($row['from_time']))) ?></td>
                          <td>$<?= esc(number_format($row['price'], 2)) ?></td>
                          <td>
                            <?php
                              $status = strtolower($row['status']); // e.g., 'completed'
                              $badgeClass = [
                                'completed' => 'bg-success',
                                'pending' => 'bg-warning text-dark',
                                'cancelled' => 'bg-danger',
                              ][$status] ?? 'bg-secondary';
                            ?>
                            <span class="badge <?= $badgeClass ?> rounded-pill p-2"><?= ucfirst($status) ?></span>
                          </td>
                        </tr>
                      <?php endforeach; ?>
                      
                      <!--DEMO-->
                      <!-- Row 1 -->
                          <tr>
                            <td>
                              <div class="d-flex align-items-center">
                                <div>
                                    <i class="ri-book-2-line fs-5 text-primary me-2"></i>
                                </div>
                                <span>Nursery Teacher</span>
                              </div>
                            </td>
                            <td>15 May 2023</td>
                            <td>10:30 AM</td>
                            <td>$125.00</td>
                            <td><span class="badge bg-success rounded-pill p-2">Completed</span></td>
                          </tr>
                          
                          <!-- Row 2 -->
                          <tr>
                            <td>
                              <div class="d-flex align-items-center">
                                <div>
                                    <i class="ri-book-2-line fs-5 text-primary me-2"></i>
                                </div>
                                <span>Primary Educator</span>
                              </div>
                            </td>
                            <td>16 May 2023</td>
                            <td>02:15 PM</td>
                            <td>$150.00</td>
                            <td><span class="badge bg-warning text-dark rounded-pill p-2">Pending</span></td>
                          </tr>
                    </tbody>

              </table>
            </div>
    </div>
    <!-- Your payment form or other elements go here -->
  </div>
</div>
